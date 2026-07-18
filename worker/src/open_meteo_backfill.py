"""Idempotent Open-Meteo backfill for disaster-model research."""

import asyncio
import hashlib
import json
import logging
from calendar import monthrange
from datetime import UTC, date, datetime, timedelta
from typing import Any, Literal
from uuid import uuid4

import httpx
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from hazard_archive import (
    data_sources,
    forecast_hourly,
    geo_locations,
    ingestion_runs,
    seed_disaster_catalog,
    stable_id,
    upsert_statement,
    weather_observation_hourly,
)
from settings import Settings

HISTORICAL_WEATHER_BACKFILL_TASK = "historical_weather_backfill"
Product = Literal["historical_forecast", "previous_runs", "archive"]

FORECAST_VARIABLE_TO_COLUMN = {
    "temperature_2m": "temperature_2m_c",
    "relative_humidity_2m": "relative_humidity_2m_pct",
    "dew_point_2m": "dew_point_2m_c",
    "precipitation": "precipitation_mm",
    "rain": "rain_mm",
    "showers": "showers_mm",
    "precipitation_probability": "precipitation_probability_pct",
    "surface_pressure": "surface_pressure_hpa",
    "cloud_cover": "cloud_cover_pct",
    "cape": "cape_j_kg",
    "wind_speed_10m": "wind_speed_10m_kmh",
    "wind_gusts_10m": "wind_gusts_10m_kmh",
    "soil_moisture_0_to_1cm": "soil_moisture_0_to_1cm",
    "soil_moisture_1_to_3cm": "soil_moisture_1_to_3cm",
    "soil_moisture_3_to_9cm": "soil_moisture_3_to_9cm",
    "soil_moisture_9_to_27cm": "soil_moisture_9_to_27cm",
    "soil_moisture_27_to_81cm": "soil_moisture_27_to_81cm",
}

HISTORICAL_FORECAST_VARIABLES = list(FORECAST_VARIABLE_TO_COLUMN)
OBSERVATION_VARIABLE_TO_COLUMN = {
    key: value
    for key, value in FORECAST_VARIABLE_TO_COLUMN.items()
    if key
    not in {
        "precipitation_probability",
        "cape",
        "soil_moisture_0_to_1cm",
        "soil_moisture_1_to_3cm",
        "soil_moisture_3_to_9cm",
        "soil_moisture_9_to_27cm",
        "soil_moisture_27_to_81cm",
    }
}
OBSERVATION_VARIABLE_TO_COLUMN.update(
    {
        "soil_moisture_0_to_7cm": "soil_moisture_0_to_7cm",
        "soil_moisture_7_to_28cm": "soil_moisture_7_to_28cm",
        "soil_moisture_28_to_100cm": "soil_moisture_28_to_100cm",
        "soil_moisture_100_to_255cm": "soil_moisture_100_to_255cm",
    }
)
ARCHIVE_VARIABLES = list(OBSERVATION_VARIABLE_TO_COLUMN)
PREVIOUS_RUN_BASE_VARIABLES = [
    "temperature_2m",
    "relative_humidity_2m",
    "dew_point_2m",
    "precipitation",
    "rain",
    "showers",
    "surface_pressure",
    "cloud_cover",
    "wind_speed_10m",
    "wind_gusts_10m",
]


def previous_run_variables(max_lead_days: int = 7) -> list[str]:
    variables = list(PREVIOUS_RUN_BASE_VARIABLES)
    for day in range(1, max_lead_days + 1):
        variables.extend(
            f"{variable}_previous_day{day}" for variable in PREVIOUS_RUN_BASE_VARIABLES
        )
    return variables


def month_chunks(start_date: date, end_date: date) -> list[tuple[date, date]]:
    if start_date > end_date:
        raise ValueError("start_date must be on or before end_date")
    chunks: list[tuple[date, date]] = []
    cursor = start_date
    while cursor <= end_date:
        final_day = monthrange(cursor.year, cursor.month)[1]
        chunk_end = min(date(cursor.year, cursor.month, final_day), end_date)
        chunks.append((cursor, chunk_end))
        cursor = chunk_end + timedelta(days=1)
    return chunks


def _utc_datetime(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return parsed.replace(tzinfo=parsed.tzinfo or UTC).astimezone(UTC)


def _array(hourly: dict[str, Any], name: str, size: int) -> list[float | None]:
    values = hourly.get(name)
    if not isinstance(values, list):
        return [None] * size
    return [value if isinstance(value, int | float) else None for value in values[:size]] + [
        None
    ] * max(0, size - len(values))


def _quality_flags(
    hourly: dict[str, Any],
    variables: list[str],
    requested: tuple[float, float],
    grid: tuple[float, float],
) -> dict[str, Any]:
    missing = [
        variable
        for variable in variables
        if variable not in hourly
        or not any(value is not None for value in hourly.get(variable, []))
    ]
    return {
        "missing_variables": missing,
        "grid_snapped": abs(requested[0] - grid[0]) > 1e-6 or abs(requested[1] - grid[1]) > 1e-6,
    }


def parse_forecast_rows(
    response: dict[str, Any],
    *,
    source_id: Any,
    location: dict[str, Any],
    ingestion_run_id: Any,
    product: Literal["historical_forecast", "previous_runs"],
    model: str,
    retrieved_at: datetime,
    max_lead_days: int = 7,
) -> list[dict[str, Any]]:
    hourly = response.get("hourly", {})
    times = hourly.get("time", [])
    if not isinstance(times, list) or not times:
        raise ValueError("Open-Meteo response contains no hourly timestamps")
    grid = (float(response["latitude"]), float(response["longitude"]))
    requested = (float(location["latitude"]), float(location["longitude"]))
    rows: list[dict[str, Any]] = []
    lead_days = range(max_lead_days + 1) if product == "previous_runs" else range(1)

    for lead_day in lead_days:
        suffix = "" if lead_day == 0 else f"_previous_day{lead_day}"
        variables = (
            PREVIOUS_RUN_BASE_VARIABLES
            if product == "previous_runs"
            else HISTORICAL_FORECAST_VARIABLES
        )
        api_variables = [f"{variable}{suffix}" for variable in variables]
        arrays = {
            variable: _array(hourly, api_name, len(times))
            for variable, api_name in zip(variables, api_variables, strict=True)
        }
        flags = _quality_flags(hourly, api_variables, requested, grid)
        for index, stamp in enumerate(times):
            valid_time = _utc_datetime(stamp)
            row = {
                "source_id": source_id,
                "location_id": location["id"],
                "ingestion_run_id": ingestion_run_id,
                "product": product,
                "model": model,
                "requested_latitude": requested[0],
                "requested_longitude": requested[1],
                "grid_latitude": grid[0],
                "grid_longitude": grid[1],
                "issue_time_utc": valid_time - timedelta(days=lead_day)
                if product == "previous_runs"
                else None,
                "issue_time_estimated": product == "previous_runs",
                "valid_time_utc": valid_time,
                "lead_hours": lead_day * 24,
                "quality_flags": flags,
                "retrieved_at": retrieved_at,
            }
            for variable, column in FORECAST_VARIABLE_TO_COLUMN.items():
                row[column] = arrays.get(variable, [None] * len(times))[index]
            rows.append(row)
    return rows


def parse_observation_rows(
    response: dict[str, Any],
    *,
    source_id: Any,
    location: dict[str, Any],
    ingestion_run_id: Any,
    model: str,
    retrieved_at: datetime,
) -> list[dict[str, Any]]:
    hourly = response.get("hourly", {})
    times = hourly.get("time", [])
    if not isinstance(times, list) or not times:
        raise ValueError("Open-Meteo response contains no hourly timestamps")
    grid = (float(response["latitude"]), float(response["longitude"]))
    requested = (float(location["latitude"]), float(location["longitude"]))
    arrays = {variable: _array(hourly, variable, len(times)) for variable in ARCHIVE_VARIABLES}
    flags = _quality_flags(hourly, ARCHIVE_VARIABLES, requested, grid)
    rows: list[dict[str, Any]] = []
    for index, stamp in enumerate(times):
        row = {
            "source_id": source_id,
            "location_id": location["id"],
            "ingestion_run_id": ingestion_run_id,
            "model": model,
            "requested_latitude": requested[0],
            "requested_longitude": requested[1],
            "grid_latitude": grid[0],
            "grid_longitude": grid[1],
            "valid_time_utc": _utc_datetime(stamp),
            "quality_flags": flags,
            "retrieved_at": retrieved_at,
        }
        for variable, column in OBSERVATION_VARIABLE_TO_COLUMN.items():
            row[column] = arrays.get(variable, [None] * len(times))[index]
        rows.append(row)
    return rows


async def _request_with_retry(
    client: httpx.AsyncClient, url: str, params: dict[str, Any], attempts: int
) -> dict[str, Any]:
    for attempt in range(attempts):
        try:
            response = await client.get(url, params=params)
            if response.status_code == 429 or response.status_code >= 500:
                if attempt + 1 < attempts:
                    retry_after = response.headers.get("Retry-After")
                    delay = (
                        float(retry_after) if retry_after and retry_after.isdigit() else 2**attempt
                    )
                    await asyncio.sleep(min(delay, 10))
                    continue
            response.raise_for_status()
            payload = response.json()
            if not isinstance(payload, dict) or payload.get("error") is True:
                raise ValueError(str(payload.get("reason", "invalid Open-Meteo payload")))
            return payload
        except httpx.RequestError:
            if attempt + 1 == attempts:
                raise
            await asyncio.sleep(2**attempt)
    raise RuntimeError("Open-Meteo request attempts exhausted")


def _product_configuration(
    settings: Settings, product: Product, model: str
) -> tuple[str, list[str], date]:
    if product == "previous_runs":
        return settings.open_meteo_previous_runs_url, previous_run_variables(), date(2024, 1, 1)
    if product == "historical_forecast":
        return (
            settings.open_meteo_historical_forecast_url,
            HISTORICAL_FORECAST_VARIABLES,
            date(2021, 3, 23),
        )
    return settings.open_meteo_historical_weather_url, ARCHIVE_VARIABLES, date(1940, 1, 1)


async def _ensure_source(
    session: AsyncSession, product: Product, model: str, endpoint: str, available_from: date
) -> Any:
    source_id = stable_id("source", f"open-meteo:{product}:{model}")
    row = {
        "id": source_id,
        "provider": "Open-Meteo",
        "dataset": product,
        "model": model,
        "license": "CC BY 4.0; Open-Meteo terms apply",
        "source_url": endpoint,
        "available_from": available_from,
        "retrieved_at": datetime.now(UTC),
    }
    await session.execute(
        upsert_statement(session, data_sources, [row], ["provider", "dataset", "model"])
    )
    await session.commit()
    return source_id


async def _execute_upsert_batches(
    session: AsyncSession,
    table: Any,
    rows: list[dict[str, Any]],
    conflict_columns: list[str],
    batch_size: int = 500,
) -> None:
    # Previous Runs expands one valid hour into eight lead-time rows. Keep each
    # statement below PostgreSQL's bind-parameter limit for month-sized chunks.
    for offset in range(0, len(rows), batch_size):
        batch = rows[offset : offset + batch_size]
        await session.execute(upsert_statement(session, table, batch, conflict_columns))


async def ingest_chunk(
    session: AsyncSession,
    settings: Settings,
    client: httpx.AsyncClient,
    *,
    product: Product,
    model: str,
    location: dict[str, Any],
    start_date: date,
    end_date: date,
) -> int:
    endpoint, variables, available_from = _product_configuration(settings, product, model)
    if start_date < available_from:
        raise ValueError(f"{product} with model {model} is unavailable before {available_from}")
    source_id = await _ensure_source(session, product, model, endpoint, available_from)
    run_id = uuid4()
    parameters = {
        "product": product,
        "model": model,
        "location_code": location["code"],
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "variables": variables,
    }
    await session.execute(
        ingestion_runs.insert().values(
            id=run_id,
            source_id=source_id,
            status="running",
            started_at=datetime.now(UTC),
            completed_at=None,
            parameters=parameters,
            row_count=0,
            raw_response_hash=None,
            error=None,
        )
    )
    await session.commit()

    params = {
        "latitude": location["latitude"],
        "longitude": location["longitude"],
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "hourly": ",".join(variables),
        "timezone": "UTC",
        "timeformat": "iso8601",
        "temperature_unit": "celsius",
        "wind_speed_unit": "kmh",
        "precipitation_unit": "mm",
    }
    if model != "best_match":
        params["models"] = model
    try:
        response = await _request_with_retry(
            client, endpoint, params, settings.open_meteo_retry_attempts
        )
        retrieved_at = datetime.now(UTC)
        digest = hashlib.sha256(
            json.dumps(response, sort_keys=True, separators=(",", ":")).encode()
        ).hexdigest()
        if product == "archive":
            rows = parse_observation_rows(
                response,
                source_id=source_id,
                location=location,
                ingestion_run_id=run_id,
                model=model,
                retrieved_at=retrieved_at,
            )
            table = weather_observation_hourly
            conflict_columns = ["source_id", "location_id", "model", "valid_time_utc"]
        else:
            rows = parse_forecast_rows(
                response,
                source_id=source_id,
                location=location,
                ingestion_run_id=run_id,
                product=product,
                model=model,
                retrieved_at=retrieved_at,
            )
            table = forecast_hourly
            conflict_columns = [
                "source_id",
                "location_id",
                "product",
                "model",
                "valid_time_utc",
                "lead_hours",
            ]
        await _execute_upsert_batches(session, table, rows, conflict_columns)
        await session.execute(
            update(ingestion_runs)
            .where(ingestion_runs.c.id == run_id)
            .values(
                status="succeeded",
                completed_at=datetime.now(UTC),
                row_count=len(rows),
                raw_response_hash=digest,
            )
        )
        await session.commit()
        return len(rows)
    except Exception as exc:
        await session.rollback()
        await session.execute(
            update(ingestion_runs)
            .where(ingestion_runs.c.id == run_id)
            .values(status="failed", completed_at=datetime.now(UTC), error=str(exc)[:4000])
        )
        await session.commit()
        raise


async def backfill_open_meteo(
    session: AsyncSession,
    settings: Settings,
    *,
    start_date: date,
    end_date: date,
    products: list[Product],
    location_codes: list[str] | None = None,
    forecast_model: str = "gfs_seamless",
    archive_model: str = "best_match",
    continue_on_error: bool = False,
    client: httpx.AsyncClient | None = None,
) -> dict[str, Any]:
    seed_result = await seed_disaster_catalog(session)
    query = select(geo_locations).where(
        geo_locations.c.is_sampling_location.is_(True),
        geo_locations.c.latitude.is_not(None),
        geo_locations.c.longitude.is_not(None),
    )
    if location_codes:
        query = query.where(geo_locations.c.code.in_(location_codes))
    locations = (await session.execute(query.order_by(geo_locations.c.code))).mappings().all()
    if not locations:
        raise ValueError("no matching sampling locations")

    total_rows = 0
    failures: list[dict[str, str]] = []
    timeout = httpx.Timeout(settings.open_meteo_timeout_seconds)
    own_client = client is None
    http_client = client or httpx.AsyncClient(timeout=timeout)
    try:
        for product in products:
            product_start = max(
                start_date, date(2024, 1, 1) if product == "previous_runs" else start_date
            )
            if product_start > end_date:
                continue
            model = archive_model if product == "archive" else forecast_model
            for location in locations:
                for chunk_start, chunk_end in month_chunks(product_start, end_date):
                    try:
                        count = await ingest_chunk(
                            session,
                            settings,
                            http_client,
                            product=product,
                            model=model,
                            location=dict(location),
                            start_date=chunk_start,
                            end_date=chunk_end,
                        )
                        total_rows += count
                        logging.info(
                            "historical_weather_ingested product=%s location=%s "
                            "start=%s end=%s rows=%d",
                            product,
                            location["code"],
                            chunk_start,
                            chunk_end,
                            count,
                        )
                    except Exception as exc:
                        failure = {
                            "product": product,
                            "location_code": location["code"],
                            "start_date": chunk_start.isoformat(),
                            "end_date": chunk_end.isoformat(),
                            "error": str(exc),
                        }
                        failures.append(failure)
                        if not continue_on_error:
                            raise
                        logging.exception("historical_weather_chunk_failed %s", failure)
    finally:
        if own_client:
            await http_client.aclose()
    return {
        "seed": seed_result,
        "locations": len(locations),
        "products": products,
        "rows_ingested": total_rows,
        "failures": failures,
    }
