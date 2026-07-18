"""Database contract and seed loader for the hazard research archive."""

import asyncio
import json
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any
from uuid import NAMESPACE_URL, UUID, uuid5

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.dialects.postgresql import insert as postgresql_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession

metadata = MetaData()

geo_locations = Table(
    "geo_locations",
    metadata,
    Column("id", Uuid(as_uuid=True), primary_key=True),
    Column("code", String(120), nullable=False, unique=True),
    Column("canonical_name", String(255), nullable=False),
    Column("parent_id", Uuid(as_uuid=True), ForeignKey("geo_locations.id")),
    Column("location_type", String(40), nullable=False),
    Column("historical_admin_name", String(255)),
    Column("current_admin_name", String(255)),
    Column("latitude", Float),
    Column("longitude", Float),
    Column("impact_geometry", JSON),
    Column("uncertainty_m", Integer),
    Column("coordinate_source", String(120)),
    Column("source_url", Text),
    Column("coordinate_confidence", String(20), nullable=False),
    Column("is_sampling_location", Boolean, nullable=False),
    Column("valid_from", Date),
    Column("valid_to", Date),
    Column("created_at", DateTime(timezone=True), nullable=False),
)

disaster_events = Table(
    "disaster_events",
    metadata,
    Column("id", Uuid(as_uuid=True), primary_key=True),
    Column("code", String(120), nullable=False, unique=True),
    Column("hazard_type", String(40), nullable=False),
    Column("started_at_utc", DateTime(timezone=True), nullable=False),
    Column("ended_at_utc", DateTime(timezone=True)),
    Column("local_date", Date, nullable=False),
    Column("description", Text, nullable=False),
    Column("verification_status", String(30), nullable=False),
    Column("severity", String(30)),
    Column("source_count", Integer, nullable=False),
    Column("created_at", DateTime(timezone=True), nullable=False),
)

disaster_event_locations = Table(
    "disaster_event_locations",
    metadata,
    Column(
        "event_id",
        Uuid(as_uuid=True),
        ForeignKey("disaster_events.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "location_id",
        Uuid(as_uuid=True),
        ForeignKey("geo_locations.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column("impact_role", String(40), nullable=False),
    Column("fatalities", Integer),
    Column("missing_people", Integer),
    Column("injured_people", Integer),
    Column("damaged_houses", Integer),
    Column("confidence", String(20), nullable=False),
    Column("notes", Text),
)

disaster_event_sources = Table(
    "disaster_event_sources",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column(
        "event_id",
        Uuid(as_uuid=True),
        ForeignKey("disaster_events.id", ondelete="CASCADE"),
        nullable=False,
    ),
    Column("title", String(500), nullable=False),
    Column("url", Text, nullable=False),
    Column("publisher", String(255)),
    Column("accessed_at", DateTime(timezone=True), nullable=False),
    UniqueConstraint("event_id", "url", name="uq_disaster_event_source_url"),
)

data_sources = Table(
    "data_sources",
    metadata,
    Column("id", Uuid(as_uuid=True), primary_key=True),
    Column("provider", String(120), nullable=False),
    Column("dataset", String(120), nullable=False),
    Column("model", String(120), nullable=False),
    Column("license", String(120), nullable=False),
    Column("source_url", Text, nullable=False),
    Column("available_from", Date),
    Column("retrieved_at", DateTime(timezone=True), nullable=False),
    UniqueConstraint("provider", "dataset", "model", name="uq_data_sources_identity"),
)

ingestion_runs = Table(
    "ingestion_runs",
    metadata,
    Column("id", Uuid(as_uuid=True), primary_key=True),
    Column("source_id", Uuid(as_uuid=True), ForeignKey("data_sources.id"), nullable=False),
    Column("status", String(20), nullable=False),
    Column("started_at", DateTime(timezone=True), nullable=False),
    Column("completed_at", DateTime(timezone=True)),
    Column("parameters", JSON, nullable=False),
    Column("row_count", Integer, nullable=False),
    Column("raw_response_hash", String(64)),
    Column("error", Text),
)

_weather_columns = [
    Column("temperature_2m_c", Float),
    Column("relative_humidity_2m_pct", Float),
    Column("dew_point_2m_c", Float),
    Column("precipitation_mm", Float),
    Column("rain_mm", Float),
    Column("showers_mm", Float),
    Column("surface_pressure_hpa", Float),
    Column("cloud_cover_pct", Float),
    Column("cape_j_kg", Float),
    Column("wind_speed_10m_kmh", Float),
    Column("wind_gusts_10m_kmh", Float),
    Column("soil_moisture_0_to_1cm", Float),
    Column("soil_moisture_1_to_3cm", Float),
    Column("soil_moisture_3_to_9cm", Float),
    Column("soil_moisture_9_to_27cm", Float),
    Column("soil_moisture_27_to_81cm", Float),
]

forecast_hourly = Table(
    "forecast_hourly",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("source_id", Uuid(as_uuid=True), ForeignKey("data_sources.id"), nullable=False),
    Column("location_id", Uuid(as_uuid=True), ForeignKey("geo_locations.id"), nullable=False),
    Column("ingestion_run_id", Uuid(as_uuid=True), ForeignKey("ingestion_runs.id"), nullable=False),
    Column("product", String(40), nullable=False),
    Column("model", String(120), nullable=False),
    Column("requested_latitude", Float, nullable=False),
    Column("requested_longitude", Float, nullable=False),
    Column("grid_latitude", Float, nullable=False),
    Column("grid_longitude", Float, nullable=False),
    Column("issue_time_utc", DateTime(timezone=True)),
    Column("issue_time_estimated", Boolean, nullable=False),
    Column("valid_time_utc", DateTime(timezone=True), nullable=False),
    Column("lead_hours", Integer, nullable=False),
    *[column._copy() for column in _weather_columns],
    Column("precipitation_probability_pct", Float),
    Column("quality_flags", JSON, nullable=False),
    Column("retrieved_at", DateTime(timezone=True), nullable=False),
    UniqueConstraint(
        "source_id",
        "location_id",
        "product",
        "model",
        "valid_time_utc",
        "lead_hours",
        name="uq_forecast_hourly_identity",
    ),
)

weather_observation_hourly = Table(
    "weather_observation_hourly",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("source_id", Uuid(as_uuid=True), ForeignKey("data_sources.id"), nullable=False),
    Column("location_id", Uuid(as_uuid=True), ForeignKey("geo_locations.id"), nullable=False),
    Column("ingestion_run_id", Uuid(as_uuid=True), ForeignKey("ingestion_runs.id"), nullable=False),
    Column("model", String(120), nullable=False),
    Column("requested_latitude", Float, nullable=False),
    Column("requested_longitude", Float, nullable=False),
    Column("grid_latitude", Float, nullable=False),
    Column("grid_longitude", Float, nullable=False),
    Column("valid_time_utc", DateTime(timezone=True), nullable=False),
    *[column._copy() for column in _weather_columns],
    Column("soil_moisture_0_to_7cm", Float),
    Column("soil_moisture_7_to_28cm", Float),
    Column("soil_moisture_28_to_100cm", Float),
    Column("soil_moisture_100_to_255cm", Float),
    Column("quality_flags", JSON, nullable=False),
    Column("retrieved_at", DateTime(timezone=True), nullable=False),
    UniqueConstraint(
        "source_id", "location_id", "model", "valid_time_utc", name="uq_observation_identity"
    ),
)

DEFAULT_CATALOG_PATH = (
    Path(__file__).resolve().parents[2]
    / "data"
    / "catalogs"
    / "dien_bien_disaster_inventory_v1.json"
)


def stable_id(kind: str, code: str) -> UUID:
    return uuid5(NAMESPACE_URL, f"weatherbridge:{kind}:{code}")


def parse_datetime(value: str | None) -> datetime | None:
    if value is None:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def upsert_statement(
    session: AsyncSession,
    table: Table,
    rows: list[dict[str, Any]],
    conflict_columns: list[str],
) -> Any:
    """Build a native SQLite/PostgreSQL upsert for deterministic backfills."""
    if not rows:
        raise ValueError("upsert requires at least one row")
    dialect = session.get_bind().dialect.name
    if dialect == "postgresql":
        statement = postgresql_insert(table).values(rows)
    elif dialect == "sqlite":
        statement = sqlite_insert(table).values(rows)
    else:
        raise RuntimeError(f"unsupported archive database dialect: {dialect}")
    excluded = statement.excluded
    update_values = {
        column.name: getattr(excluded, column.name)
        for column in table.columns
        if column.name not in {"id", *conflict_columns}
    }
    return statement.on_conflict_do_update(
        index_elements=[table.c[name] for name in conflict_columns],
        set_=update_values,
    )


async def seed_disaster_catalog(
    session: AsyncSession, catalog_path: Path = DEFAULT_CATALOG_PATH
) -> dict[str, int]:
    catalog_text = await asyncio.to_thread(catalog_path.read_text, encoding="utf-8")
    catalog = json.loads(catalog_text)
    now = datetime.now(UTC)
    locations = catalog["locations"]
    location_ids = {item["code"]: stable_id("location", item["code"]) for item in locations}

    location_rows: list[dict[str, Any]] = []
    for item in locations:
        location_rows.append(
            {
                "id": location_ids[item["code"]],
                "code": item["code"],
                "canonical_name": item["canonical_name"],
                "parent_id": location_ids.get(item.get("parent_code")),
                "location_type": item["location_type"],
                "historical_admin_name": item.get("historical_admin_name"),
                "current_admin_name": item.get("current_admin_name"),
                "latitude": item.get("latitude"),
                "longitude": item.get("longitude"),
                "impact_geometry": item.get("impact_geometry"),
                "uncertainty_m": item.get("uncertainty_m"),
                "coordinate_source": item.get("coordinate_source"),
                "source_url": item.get("source_url"),
                "coordinate_confidence": item["coordinate_confidence"],
                "is_sampling_location": item["is_sampling_location"],
                "valid_from": date.fromisoformat(item["valid_from"])
                if item.get("valid_from")
                else None,
                "valid_to": date.fromisoformat(item["valid_to"]) if item.get("valid_to") else None,
                "created_at": now,
            }
        )
    await session.execute(upsert_statement(session, geo_locations, location_rows, ["code"]))

    event_rows: list[dict[str, Any]] = []
    link_rows: list[dict[str, Any]] = []
    source_rows: list[dict[str, Any]] = []
    for event in catalog["events"]:
        event_id = stable_id("event", event["code"])
        event_rows.append(
            {
                "id": event_id,
                "code": event["code"],
                "hazard_type": event["hazard_type"],
                "started_at_utc": parse_datetime(event["started_at_utc"]),
                "ended_at_utc": parse_datetime(event.get("ended_at_utc")),
                "local_date": date.fromisoformat(event["local_date"]),
                "description": event["description"],
                "verification_status": event["verification_status"],
                "severity": event.get("severity"),
                "source_count": len(event.get("sources", [])),
                "created_at": now,
            }
        )
        for location in event["locations"]:
            link_rows.append(
                {
                    "event_id": event_id,
                    "location_id": location_ids[location["code"]],
                    "impact_role": location["impact_role"],
                    "fatalities": location.get("fatalities"),
                    "missing_people": location.get("missing_people"),
                    "injured_people": location.get("injured_people"),
                    "damaged_houses": location.get("damaged_houses"),
                    "confidence": location["confidence"],
                    "notes": location.get("notes"),
                }
            )
        for source in event.get("sources", []):
            source_rows.append(
                {
                    "event_id": event_id,
                    "title": source["title"],
                    "url": source["url"],
                    "publisher": source.get("publisher"),
                    "accessed_at": now,
                }
            )

    await session.execute(upsert_statement(session, disaster_events, event_rows, ["code"]))
    await session.execute(
        upsert_statement(session, disaster_event_locations, link_rows, ["event_id", "location_id"])
    )
    if source_rows:
        await session.execute(
            upsert_statement(session, disaster_event_sources, source_rows, ["event_id", "url"])
        )
    await session.commit()
    return {
        "locations": len(location_rows),
        "events": len(event_rows),
        "event_locations": len(link_rows),
        "event_sources": len(source_rows),
    }
