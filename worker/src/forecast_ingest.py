"""Open-Meteo forecast ingest (Story 2.2, FR3).

Fetches the rainfall forecast for a configured location and appends a
snapshot row to PostgreSQL. Snapshots are append-only: a failed fetch marks the
job failed and leaves the last good snapshot in place, so the heatmap is never
blanked by an upstream outage. Open-Meteo's forecast endpoint serves GFS/IFS
"best match" model data — never ERA5 reanalysis (AC of Story 2.2).

Also stores WMO fog proxies: daily min visibility and mean temperature /
dew point for dew-point depression (DPD) display — not a hand-tuned fog score.
"""

import base64
import json
import logging
from datetime import UTC, datetime
from typing import TYPE_CHECKING
from uuid import uuid4

import aioboto3
import httpx
from modules.forecasts.locations import LOCATIONS, ForecastLocation
from sqlalchemy import JSON, Column, DateTime, Float, MetaData, String, Table, Uuid, insert, select
from sqlalchemy.ext.asyncio import AsyncSession

if TYPE_CHECKING:
    from settings import Settings

from risk_scoring import (
    BIAS_CORRECTION_HOURLY_VARS,
    bias_correct_hourly,
    daily_max_exceedance,
    daily_sums,
    risk_level,
    trigger_level,
)

FORECAST_INGEST_TASK = "forecast_ingest"
SOURCE = "open-meteo:best_match"
# Hourly variables requested from Open-Meteo: precipitation drives the trigger;
# the rest feed the optional bias-correction model; visibility is the WMO fog proxy.
HOURLY_VARS = ",".join([*BIAS_CORRECTION_HOURLY_VARS, "visibility"])

metadata = MetaData()
forecast_snapshots = Table(
    "forecast_snapshots",
    metadata,
    # Mirrors migration 0002. The worker deliberately does not import API ORM
    # models, keeping deploy units independent (same pattern as job_store).
    Column("id", Uuid(as_uuid=True), primary_key=True),
    Column("location_code", String(80), nullable=False),
    Column("latitude", Float, nullable=False),
    Column("longitude", Float, nullable=False),
    Column("source", String(120), nullable=False),
    Column("days", JSON, nullable=False),
    Column("fetched_at", DateTime(timezone=True), nullable=False),
)

hazard_model_versions = Table(
    "hazard_model_versions",
    metadata,
    Column("id", Uuid(as_uuid=True), primary_key=True),
    Column("name", String(120), nullable=False),
    Column("description", String, nullable=True),
    Column("is_active", String(30), nullable=False),
)

hazard_runs = Table(
    "hazard_runs",
    metadata,
    Column("id", Uuid(as_uuid=True), primary_key=True),
    Column("hazard_type", String(30), nullable=False),
    Column("model_version_id", Uuid(as_uuid=True), nullable=False),
    Column("input_ingestion_run_id", Uuid(as_uuid=True), nullable=True),
    Column("issued_at", DateTime(timezone=True), nullable=False),
    Column("valid_from", DateTime(timezone=True), nullable=False),
    Column("valid_to", DateTime(timezone=True), nullable=False),
    Column("status", String(20), nullable=False),
    Column("quality_flags", JSON, nullable=False),
    Column("error", String, nullable=True),
    Column("created_at", DateTime(timezone=True), nullable=False),
    Column("updated_at", DateTime(timezone=True), nullable=False),
)

hazard_layers = Table(
    "hazard_layers",
    metadata,
    Column("id", Uuid(as_uuid=True), primary_key=True),
    Column("run_id", Uuid(as_uuid=True), nullable=False),
    Column("hazard_type", String(30), nullable=False),
    Column("forecast_day", DateTime(timezone=True), nullable=False), # Date
    Column("is_current", String(30), nullable=False), # boolean
    Column("cog_object_key", String, nullable=False),
    Column("png_object_key", String, nullable=False),
    Column("bbox", JSON, nullable=False),
    Column("crs", String(30), nullable=False),
    Column("resolution_m", Float, nullable=False),
    Column("level_bins", JSON, nullable=False),
    Column("legend", JSON, nullable=False),
    Column("confidence", Float, nullable=False),
    Column("contribution_summary", JSON, nullable=False),
    Column("checksum", String(64), nullable=False),
    Column("created_at", DateTime(timezone=True), nullable=False),
)

hazard_zones = Table(
    "hazard_zones",
    metadata,
    Column("id", Uuid(as_uuid=True), primary_key=True),
    Column("layer_id", Uuid(as_uuid=True), nullable=False),
    Column("risk_level", Float, nullable=False), # integer in DB, but float is fine for core
    Column("geometry", String, nullable=False), # WKT
)


def _mean(values: list[float]) -> float | None:
    if not values:
        return None
    return round(sum(values) / len(values), 2)


def build_days(data: dict) -> list[dict]:
    """Shape the Open-Meteo response into per-day rainfall, intensity, and fog proxies."""
    daily_times: list[str] = data["daily"]["time"]
    daily_rain: list[float | None] = data["daily"]["precipitation_sum"]

    peak_by_date: dict[str, float] = {}
    min_visibility_by_date: dict[str, float] = {}
    temps_by_date: dict[str, list[float]] = {}
    dew_by_date: dict[str, list[float]] = {}

    hourly = data.get("hourly", {})
    hourly_times: list[str] = hourly.get("time", [])
    hourly_rain: list[float | None] = hourly.get("precipitation", [])
    hourly_visibility: list[float | None] = hourly.get("visibility", [])
    hourly_temp: list[float | None] = hourly.get("temperature_2m", [])
    hourly_dew: list[float | None] = hourly.get("dew_point_2m", [])

    for index, stamp in enumerate(hourly_times):
        date = stamp[:10]
        rain = hourly_rain[index] if index < len(hourly_rain) else None
        peak_by_date[date] = max(peak_by_date.get(date, 0.0), rain or 0.0)
        if index < len(hourly_visibility) and hourly_visibility[index] is not None:
            visibility = float(hourly_visibility[index])
            previous = min_visibility_by_date.get(date)
            min_visibility_by_date[date] = (
                visibility if previous is None else min(previous, visibility)
            )
        if index < len(hourly_temp) and hourly_temp[index] is not None:
            temps_by_date.setdefault(date, []).append(float(hourly_temp[index]))
        if index < len(hourly_dew) and hourly_dew[index] is not None:
            dew_by_date.setdefault(date, []).append(float(hourly_dew[index]))

    days: list[dict] = []
    for date, rain in zip(daily_times, daily_rain, strict=True):
        entry: dict = {
            "date": date,
            "rainfall_mm": round(rain or 0.0, 2),
            "peak_intensity_mm_h": round(peak_by_date.get(date, 0.0), 2),
        }
        if date in min_visibility_by_date:
            entry["min_visibility_m"] = round(min_visibility_by_date[date], 1)
        temperature = _mean(temps_by_date.get(date, []))
        dew_point = _mean(dew_by_date.get(date, []))
        if temperature is not None:
            entry["temperature_2m_c"] = temperature
        if dew_point is not None:
            entry["dew_point_2m_c"] = dew_point
        days.append(entry)
    return days


def enrich_days(
    days: list[dict],
    data: dict,
    location: ForecastLocation,
    model_path: str | None = None,
) -> list[dict]:
    """Add the rainfall trigger + composite risk to each forecast day.

    The trigger runs on raw hourly precipitation (robust for extremes); the
    optional bias-correction model only supplies the displayed corrected
    rainfall. ``bias_corrected`` records whether the model actually ran.
    """
    hourly = data.get("hourly", {})
    times = hourly.get("time", [])
    precip = [p or 0.0 for p in hourly.get("precipitation", [])]

    daily_ratio = daily_max_exceedance(times, precip, location.trigger_alpha, location.trigger_beta)
    corrected_hourly = bias_correct_hourly(hourly, model_path)
    corrected_daily = daily_sums(times, corrected_hourly) if corrected_hourly else None

    for day in days:
        date = day["date"]
        ratio = daily_ratio.get(date, 0.0)
        day["id_exceedance"] = round(ratio, 3)
        day["trigger_level"] = trigger_level(ratio)
        day["risk_level"] = risk_level(ratio, location.terrain_factor)
        day["bias_corrected"] = corrected_daily is not None
        day["corrected_rainfall_mm"] = (
            round(corrected_daily.get(date, 0.0), 2) if corrected_daily else day["rainfall_mm"]
        )
    return days


async def ingest_forecast(
    session: AsyncSession,
    payload: dict,
    settings: "Settings",
    client: httpx.AsyncClient | None = None,
) -> dict:
    location_code = payload.get("location_code", "")
    location = LOCATIONS.get(location_code)
    if location is None:
        raise ValueError(f"unknown forecast location: {location_code!r}")

    params = {
        "latitude": location.latitude,
        "longitude": location.longitude,
        "daily": "precipitation_sum",
        "hourly": HOURLY_VARS,
        "forecast_days": 8,
        "timezone": "Asia/Bangkok",
    }
    if client is not None:
        response = await client.get(settings.open_meteo_base_url, params=params)
    else:
        async with httpx.AsyncClient(timeout=30.0) as own_client:
            response = await own_client.get(settings.open_meteo_base_url, params=params)
    response.raise_for_status()
    data = response.json()

    days = build_days(data)
    if not days:
        raise ValueError("Open-Meteo returned an empty forecast")
    days = enrich_days(days, data, location, settings.bias_correction_model_path or None)

    fetched_at = datetime.now(UTC)
    snapshot_id = uuid4()
    await session.execute(
        insert(forecast_snapshots).values(
            id=snapshot_id,
            location_code=location.code,
            latitude=location.latitude,
            longitude=location.longitude,
            source=SOURCE,
            days=days,
            fetched_at=fetched_at,
        )
    )
    await session.commit()

    logging.info(
        "forecast_ingested location=%s days=%d source=%s", location.code, len(days), SOURCE
    )

    try:
        await generate_and_save_hazard_run(
            session, location.code, days, fetched_at, snapshot_id, settings, client
        )
    except Exception as e:
        logging.exception("Failed to generate hazard run for %s: %s", location.code, e)

    return {
        "location_code": location.code,
        "days_ingested": len(days),
        "source": SOURCE,
        "fetched_at": fetched_at.isoformat(),
    }


async def generate_and_save_hazard_run(
    session: AsyncSession,
    location_code: str,
    days: list[dict],
    fetched_at: datetime,
    snapshot_id: Uuid,
    settings: "Settings",
    client: httpx.AsyncClient | None = None,
) -> None:
    # 1. Ensure Model Version exists
    active_version = (await session.execute(
        select(hazard_model_versions).where(hazard_model_versions.c.is_active == "true")
    )).mappings().first()

    if not active_version:
        version_id = uuid4()
        await session.execute(
            insert(hazard_model_versions).values(
                id=version_id,
                name="AI Model v1",
                description="Default generated by worker",
                is_active="true"
            )
        )
    else:
        version_id = active_version["id"]

    run_id = uuid4()
    
    # Sort days to find valid_to
    valid_from = fetched_at
    valid_to = datetime.fromisoformat(days[-1]["date"] + "T23:59:59+07:00")

    await session.execute(
        insert(hazard_runs).values(
            id=run_id,
            hazard_type="flash_flood",
            model_version_id=version_id,
            input_ingestion_run_id=None, # In real system might map to ingestion_runs if available
            issued_at=fetched_at,
            valid_from=valid_from,
            valid_to=valid_to,
            status="running",
            quality_flags={},
            error=None,
            created_at=fetched_at,
            updated_at=fetched_at,
        )
    )

    if settings.object_storage_s3_endpoint and settings.object_storage_bucket:
        s3_session = aioboto3.Session()
        s3_client_ctx = s3_session.client(
            "s3",
            endpoint_url=settings.object_storage_s3_endpoint,
            aws_access_key_id=settings.object_storage_access_key,
            aws_secret_access_key=settings.object_storage_secret_key,
        )
    else:
        s3_client_ctx = None

    try:
        if client is None:
            async with httpx.AsyncClient(timeout=60.0) as http_client:
                await _process_days(
                    http_client,
                    session,
                    location_code,
                    days,
                    run_id,
                    fetched_at,
                    settings,
                    s3_client_ctx,
                )
        else:
            await _process_days(
                client,
                session,
                location_code,
                days,
                run_id,
                fetched_at,
                settings,
                s3_client_ctx,
            )

        await session.execute(
            hazard_runs.update().where(hazard_runs.c.id == run_id).values(status="completed")
        )
        await session.commit()
    except Exception as e:
        await session.rollback()
        logging.exception("Error in hazard run %s: %s", run_id, e)
        # We could mark the run as failed here


async def _process_days(
    http_client: httpx.AsyncClient,
    session: AsyncSession,
    location_code: str,
    days: list[dict],
    run_id: Uuid,
    fetched_at: datetime,
    settings: "Settings",
    s3_client_ctx,
) -> None:
    for day in days:
        if day["id_exceedance"] <= 0.0:
            continue
        
        resp = await http_client.post(
            settings.ai_inference_url,
            json={"location_code": location_code, "trigger_ratio": day["id_exceedance"]}
        )
        resp.raise_for_status()
        ai_result = resp.json()

        # Upload webp
        forecast_day_date = datetime.fromisoformat(day["date"]).date()
        webp_data = base64.b64decode(ai_result["webp_base64"])
        png_key = f"hazards/flash_flood/{run_id}/{forecast_day_date.isoformat()}.webp"
        
        if s3_client_ctx:
            async with s3_client_ctx as s3:
                await s3.put_object(
                    Bucket=settings.object_storage_bucket,
                    Key=png_key,
                    Body=webp_data,
                    ContentType="image/webp",
                )

        layer_id = uuid4()
        await session.execute(
            insert(hazard_layers).values(
                id=layer_id,
                run_id=run_id,
                hazard_type="flash_flood",
                forecast_day=datetime.fromisoformat(day["date"] + "T00:00:00Z"),
                is_current=True,
                cog_object_key="",
                png_object_key=png_key,
                bbox={"bounds": ai_result["bbox"]},
                crs="EPSG:32648",
                resolution_m=30.0,
                level_bins=[0, 1, 2, 3, 4],
                legend={},
                confidence=0.8,
                contribution_summary={},
                checksum="computed",
                created_at=fetched_at,
            )
        )

        # Insert polygons
        features = ai_result["geojson"]["features"]
        for feat in features:
            await session.execute(
                insert(hazard_zones).values(
                    id=uuid4(),
                    layer_id=layer_id,
                    risk_level=feat["properties"]["level"],
                    geometry=json.dumps(feat["geometry"]),
                )
            )

