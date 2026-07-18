"""Quality reporting and CSV exports for offline model development."""

import asyncio
import csv
import json
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from hazard_archive import (
    DEFAULT_CATALOG_PATH,
    disaster_event_locations,
    disaster_event_sources,
    disaster_events,
    forecast_hourly,
    geo_locations,
    ingestion_runs,
    weather_observation_hourly,
)

TRAINING_CSV_EXPORT_TASK = "training_csv_export"
DEFAULT_TRAINING_DIR = Path(__file__).resolve().parents[2] / "data" / "processed" / "training"


def _csv_value(value: Any) -> Any:
    if value is None:
        return ""
    if isinstance(value, datetime | date):
        return value.isoformat()
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, dict | list):
        return json.dumps(value, ensure_ascii=False, sort_keys=True)
    return value


def _write_rows(path: Path, headers: list[str], rows: list[dict[str, Any]], append: bool) -> None:
    with path.open("a" if append else "w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=headers, lineterminator="\n")
        if not append:
            writer.writeheader()
        writer.writerows(
            {header: _csv_value(row.get(header)) for header in headers} for row in rows
        )


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True, default=str) + "\n",
        encoding="utf-8",
    )


async def _export_query(
    session: AsyncSession,
    path: Path,
    query: Any,
    headers: list[str],
    *,
    batch_size: int = 5000,
) -> int:
    result = await session.stream(query)
    count = 0
    append = False
    async for partition in result.mappings().partitions(batch_size):
        rows = [dict(row) for row in partition]
        await asyncio.to_thread(_write_rows, path, headers, rows, append)
        append = True
        count += len(rows)
    if not append:
        await asyncio.to_thread(_write_rows, path, headers, [], False)
    return count


async def export_training_csv(
    session: AsyncSession,
    output_dir: Path = DEFAULT_TRAINING_DIR,
    tables: list[str] | None = None,
) -> dict[str, int | str]:
    await asyncio.to_thread(output_dir.mkdir, parents=True, exist_ok=True)
    training_samples = select(
        geo_locations.c.code.label("location_code"),
        forecast_hourly.c.requested_latitude,
        forecast_hourly.c.requested_longitude,
        forecast_hourly.c.grid_latitude.label("forecast_grid_latitude"),
        forecast_hourly.c.grid_longitude.label("forecast_grid_longitude"),
        forecast_hourly.c.product,
        forecast_hourly.c.model.label("forecast_model"),
        forecast_hourly.c.issue_time_utc,
        forecast_hourly.c.issue_time_estimated,
        forecast_hourly.c.valid_time_utc,
        forecast_hourly.c.lead_hours,
        forecast_hourly.c.temperature_2m_c.label("forecast_temperature_2m_c"),
        forecast_hourly.c.relative_humidity_2m_pct.label(
            "forecast_relative_humidity_2m_pct"
        ),
        forecast_hourly.c.dew_point_2m_c.label("forecast_dew_point_2m_c"),
        forecast_hourly.c.precipitation_mm.label("forecast_precipitation_mm"),
        forecast_hourly.c.rain_mm.label("forecast_rain_mm"),
        forecast_hourly.c.showers_mm.label("forecast_showers_mm"),
        forecast_hourly.c.surface_pressure_hpa.label("forecast_surface_pressure_hpa"),
        forecast_hourly.c.cloud_cover_pct.label("forecast_cloud_cover_pct"),
        forecast_hourly.c.cape_j_kg.label("forecast_cape_j_kg"),
        forecast_hourly.c.wind_speed_10m_kmh.label("forecast_wind_speed_10m_kmh"),
        forecast_hourly.c.wind_gusts_10m_kmh.label("forecast_wind_gusts_10m_kmh"),
        forecast_hourly.c.quality_flags.label("forecast_quality_flags"),
        weather_observation_hourly.c.grid_latitude.label("observation_grid_latitude"),
        weather_observation_hourly.c.grid_longitude.label("observation_grid_longitude"),
        weather_observation_hourly.c.temperature_2m_c.label("observed_temperature_2m_c"),
        weather_observation_hourly.c.relative_humidity_2m_pct.label(
            "observed_relative_humidity_2m_pct"
        ),
        weather_observation_hourly.c.dew_point_2m_c.label("observed_dew_point_2m_c"),
        weather_observation_hourly.c.precipitation_mm.label("observed_precipitation_mm"),
        weather_observation_hourly.c.rain_mm.label("observed_rain_mm"),
        weather_observation_hourly.c.showers_mm.label("observed_showers_mm"),
        weather_observation_hourly.c.surface_pressure_hpa.label(
            "observed_surface_pressure_hpa"
        ),
        weather_observation_hourly.c.cloud_cover_pct.label("observed_cloud_cover_pct"),
        weather_observation_hourly.c.wind_speed_10m_kmh.label(
            "observed_wind_speed_10m_kmh"
        ),
        weather_observation_hourly.c.wind_gusts_10m_kmh.label(
            "observed_wind_gusts_10m_kmh"
        ),
        weather_observation_hourly.c.soil_moisture_0_to_7cm,
        weather_observation_hourly.c.soil_moisture_7_to_28cm,
        weather_observation_hourly.c.soil_moisture_28_to_100cm,
        weather_observation_hourly.c.soil_moisture_100_to_255cm,
        weather_observation_hourly.c.quality_flags.label("observation_quality_flags"),
    ).select_from(
        forecast_hourly.join(
            weather_observation_hourly,
            (weather_observation_hourly.c.location_id == forecast_hourly.c.location_id)
            & (
                weather_observation_hourly.c.valid_time_utc
                == forecast_hourly.c.valid_time_utc
            )
            & (weather_observation_hourly.c.model == "best_match"),
        ).join(geo_locations, geo_locations.c.id == forecast_hourly.c.location_id)
    )
    training_headers = [column.key for column in training_samples.selected_columns]
    exports = {
        "locations.csv": (
            [column.name for column in geo_locations.columns],
            select(geo_locations).order_by(geo_locations.c.code),
        ),
        "disaster_events.csv": (
            [column.name for column in disaster_events.columns],
            select(disaster_events).order_by(disaster_events.c.started_at_utc),
        ),
        "disaster_event_locations.csv": (
            [column.name for column in disaster_event_locations.columns],
            select(disaster_event_locations).order_by(
                disaster_event_locations.c.event_id, disaster_event_locations.c.location_id
            ),
        ),
        "disaster_event_sources.csv": (
            [column.name for column in disaster_event_sources.columns],
            select(disaster_event_sources).order_by(
                disaster_event_sources.c.event_id, disaster_event_sources.c.id
            ),
        ),
        "forecast_hourly.csv": (
            [column.name for column in forecast_hourly.columns],
            select(forecast_hourly).order_by(
                forecast_hourly.c.location_id,
                forecast_hourly.c.valid_time_utc,
                forecast_hourly.c.lead_hours,
            ),
        ),
        "weather_observation_hourly.csv": (
            [column.name for column in weather_observation_hourly.columns],
            select(weather_observation_hourly).order_by(
                weather_observation_hourly.c.location_id,
                weather_observation_hourly.c.valid_time_utc,
            ),
        ),
        "ingestion_runs.csv": (
            [column.name for column in ingestion_runs.columns],
            select(ingestion_runs).order_by(ingestion_runs.c.started_at),
        ),
        "training_samples.csv": (
            training_headers,
            training_samples.order_by(
                forecast_hourly.c.location_id,
                forecast_hourly.c.valid_time_utc,
                forecast_hourly.c.lead_hours,
            ),
        ),
    }
    result: dict[str, int | str] = {"output_dir": str(output_dir)}
    for filename, (headers, query) in exports.items():
        if tables and filename.removesuffix(".csv") not in tables:
            continue
        result[filename] = await _export_query(session, output_dir / filename, query, headers)
    csv_files = {}
    csv_paths = await asyncio.to_thread(lambda: sorted(output_dir.glob("*.csv")))
    for path in csv_paths:
        stat = await asyncio.to_thread(path.stat)
        csv_files[path.name] = {"size_bytes": stat.st_size}
    manifest = {
        "dataset": "weatherbridge_dien_bien_hazard_training",
        "schema_version": "1.1.0",
        "generated_at_utc": datetime.now(UTC).isoformat(),
        "coordinate_reference_system": "EPSG:4326",
        "forecast_model": "gfs_seamless",
        "observation_product": "Open-Meteo Historical Weather best_match (ERA5/ERA5-Land)",
        "quality": await archive_quality_report(session),
        "files": csv_files,
    }
    await asyncio.to_thread(_write_json, output_dir / "manifest.json", manifest)
    result["manifest.json"] = str(output_dir / "manifest.json")
    return result


def _flatten_catalog(catalog: dict[str, Any]) -> dict[str, tuple[list[str], list[dict[str, Any]]]]:
    locations = catalog["locations"]
    events: list[dict[str, Any]] = []
    event_locations: list[dict[str, Any]] = []
    event_sources: list[dict[str, Any]] = []
    for event in catalog["events"]:
        events.append(
            {key: value for key, value in event.items() if key not in {"locations", "sources"}}
        )
        event_locations.extend(
            {"event_code": event["code"], **location} for location in event["locations"]
        )
        event_sources.extend(
            {"event_code": event["code"], **source} for source in event.get("sources", [])
        )
    location_headers = sorted({key for item in locations for key in item})
    event_headers = sorted({key for item in events for key in item})
    event_location_headers = sorted({key for item in event_locations for key in item})
    event_source_headers = sorted({key for item in event_sources for key in item})
    return {
        "dien_bien_locations_v1.csv": (location_headers, locations),
        "dien_bien_disaster_events_v1.csv": (event_headers, events),
        "dien_bien_event_locations_v1.csv": (event_location_headers, event_locations),
        "dien_bien_event_sources_v1.csv": (event_source_headers, event_sources),
    }


async def export_catalog_csv(
    catalog_path: Path = DEFAULT_CATALOG_PATH, output_dir: Path | None = None
) -> dict[str, int | str]:
    output_dir = output_dir or catalog_path.parent
    catalog_text = await asyncio.to_thread(catalog_path.read_text, encoding="utf-8")
    catalog = json.loads(catalog_text)
    await asyncio.to_thread(output_dir.mkdir, parents=True, exist_ok=True)
    result: dict[str, int | str] = {"output_dir": str(output_dir)}
    for filename, (headers, rows) in _flatten_catalog(catalog).items():
        await asyncio.to_thread(_write_rows, output_dir / filename, headers, rows, False)
        result[filename] = len(rows)
    return result


async def archive_quality_report(session: AsyncSession) -> dict[str, Any]:
    unresolved = await session.scalar(
        select(func.count())
        .select_from(geo_locations)
        .where(geo_locations.c.coordinate_confidence == "unresolved")
    )
    sampling = await session.scalar(
        select(func.count())
        .select_from(geo_locations)
        .where(geo_locations.c.is_sampling_location.is_(True))
    )
    failed_runs = await session.scalar(
        select(func.count()).select_from(ingestion_runs).where(ingestion_runs.c.status == "failed")
    )
    interrupted_runs = await session.scalar(
        select(func.count())
        .select_from(ingestion_runs)
        .where(ingestion_runs.c.status == "interrupted")
    )
    forecast_rows = await session.scalar(select(func.count()).select_from(forecast_hourly))
    observation_rows = await session.scalar(
        select(func.count()).select_from(weather_observation_hourly)
    )
    return {
        "sampling_locations": sampling or 0,
        "unresolved_event_locations": unresolved or 0,
        "forecast_rows": forecast_rows or 0,
        "observation_rows": observation_rows or 0,
        "failed_ingestion_runs": failed_runs or 0,
        "interrupted_ingestion_runs": interrupted_runs or 0,
        "training_ready": bool(forecast_rows and observation_rows),
    }
