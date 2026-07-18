"""Open-Meteo forecast ingest (Story 2.2, FR3).

Fetches the 7-day rainfall forecast for a configured location and appends a
snapshot row to PostgreSQL. Snapshots are append-only: a failed fetch marks the
job failed and leaves the last good snapshot in place, so the heatmap is never
blanked by an upstream outage. Open-Meteo's forecast endpoint serves GFS/IFS
"best match" model data — never ERA5 reanalysis (AC of Story 2.2).
"""

import logging
from datetime import UTC, datetime
from uuid import uuid4

import httpx
from modules.forecasts.locations import LOCATIONS, ForecastLocation
from sqlalchemy import JSON, Column, DateTime, Float, MetaData, String, Table, Uuid, insert
from sqlalchemy.ext.asyncio import AsyncSession

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
# the rest feed the optional bias-correction model.
HOURLY_VARS = ",".join(BIAS_CORRECTION_HOURLY_VARS)

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


def build_days(data: dict) -> list[dict]:
    """Shape the Open-Meteo response into per-day rainfall + peak intensity."""
    daily_times: list[str] = data["daily"]["time"]
    daily_rain: list[float | None] = data["daily"]["precipitation_sum"]

    peak_by_date: dict[str, float] = {}
    hourly_times: list[str] = data.get("hourly", {}).get("time", [])
    hourly_rain: list[float | None] = data.get("hourly", {}).get("precipitation", [])
    for stamp, value in zip(hourly_times, hourly_rain, strict=False):
        date = stamp[:10]
        peak_by_date[date] = max(peak_by_date.get(date, 0.0), value or 0.0)

    return [
        {
            "date": date,
            "rainfall_mm": round(rain or 0.0, 2),
            "peak_intensity_mm_h": round(peak_by_date.get(date, 0.0), 2),
        }
        for date, rain in zip(daily_times, daily_rain, strict=True)
    ]


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
    base_url: str,
    client: httpx.AsyncClient | None = None,
    model_path: str | None = None,
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
        "forecast_days": 7,
        "timezone": "Asia/Bangkok",
    }
    if client is not None:
        response = await client.get(base_url, params=params)
    else:
        async with httpx.AsyncClient(timeout=30.0) as own_client:
            response = await own_client.get(base_url, params=params)
    response.raise_for_status()
    data = response.json()

    days = build_days(data)
    if not days:
        raise ValueError("Open-Meteo returned an empty forecast")
    days = enrich_days(days, data, location, model_path)

    fetched_at = datetime.now(UTC)
    await session.execute(
        insert(forecast_snapshots).values(
            id=uuid4(),
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
    return {
        "location_code": location.code,
        "days_ingested": len(days),
        "source": SOURCE,
        "fetched_at": fetched_at.isoformat(),
    }
