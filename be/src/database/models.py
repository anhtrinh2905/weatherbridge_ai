from datetime import date, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column

from database.base import Base
from database.spatial import SpatialValue


class JobStatus(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"


class AiJob(Base):
    __tablename__ = "ai_jobs"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[str] = mapped_column(String(255), index=True)
    task: Mapped[str] = mapped_column(String(80))
    status: Mapped[str] = mapped_column(String(20), default=JobStatus.QUEUED.value, index=True)
    payload: Mapped[dict[str, object]] = mapped_column(JSON)
    result: Mapped[dict[str, object] | None] = mapped_column(JSON, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ForecastSnapshot(Base):
    """One successful Open-Meteo ingest run for a location (FR3, Story 2.2).

    Each run appends a new snapshot; readers take the latest per location, so a
    failed ingest never blanks the map — the previous snapshot stays current.
    """

    __tablename__ = "forecast_snapshots"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    location_code: Mapped[str] = mapped_column(String(80), index=True)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    source: Mapped[str] = mapped_column(String(120))
    # [{"date": "YYYY-MM-DD", "rainfall_mm": float, "peak_intensity_mm_h": float}]
    days: Mapped[list[dict[str, object]]] = mapped_column(JSON)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class GeoLocation(Base):
    """Versioned WGS84 location used by disaster labels and weather sampling."""

    __tablename__ = "geo_locations"
    __table_args__ = (
        CheckConstraint(
            "(latitude IS NULL AND longitude IS NULL) OR "
            "(latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)",
            name="ck_geo_locations_coordinates",
        ),
        Index("ix_geo_locations_code", "code"),
        Index("ix_geo_locations_boundary_gist", "boundary", postgresql_using="gist"),
        Index("ix_geo_locations_centroid_gist", "centroid", postgresql_using="gist"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    code: Mapped[str] = mapped_column(String(120), unique=True)
    canonical_name: Mapped[str] = mapped_column(String(255))
    parent_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("geo_locations.id"), nullable=True, index=True
    )
    location_type: Mapped[str] = mapped_column(String(40), index=True)
    historical_admin_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    current_admin_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    impact_geometry: Mapped[dict[str, object] | None] = mapped_column(JSON, nullable=True)
    boundary: Mapped[object | None] = mapped_column(SpatialValue("MULTIPOLYGON"), nullable=True)
    centroid: Mapped[object | None] = mapped_column(
        SpatialValue("POINT", geography=True), nullable=True
    )
    admin_level: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    uncertainty_m: Mapped[int | None] = mapped_column(Integer, nullable=True)
    coordinate_source: Mapped[str | None] = mapped_column(String(120), nullable=True)
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    coordinate_confidence: Mapped[str] = mapped_column(String(20), index=True)
    is_sampling_location: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    valid_from: Mapped[date | None] = mapped_column(Date, nullable=True)
    valid_to: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class DisasterEvent(Base):
    __tablename__ = "disaster_events"
    __table_args__ = (Index("ix_disaster_events_code", "code"),)

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    code: Mapped[str] = mapped_column(String(120), unique=True)
    hazard_type: Mapped[str] = mapped_column(String(40), index=True)
    started_at_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    ended_at_utc: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    local_date: Mapped[date] = mapped_column(Date, index=True)
    description: Mapped[str] = mapped_column(Text)
    verification_status: Mapped[str] = mapped_column(String(30), index=True)
    severity: Mapped[str | None] = mapped_column(String(30), nullable=True)
    source_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class DisasterEventLocation(Base):
    __tablename__ = "disaster_event_locations"

    event_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("disaster_events.id", ondelete="CASCADE"), primary_key=True
    )
    location_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("geo_locations.id", ondelete="CASCADE"), primary_key=True
    )
    impact_role: Mapped[str] = mapped_column(String(40))
    fatalities: Mapped[int | None] = mapped_column(Integer, nullable=True)
    missing_people: Mapped[int | None] = mapped_column(Integer, nullable=True)
    injured_people: Mapped[int | None] = mapped_column(Integer, nullable=True)
    damaged_houses: Mapped[int | None] = mapped_column(Integer, nullable=True)
    confidence: Mapped[str] = mapped_column(String(20))
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class DisasterEventSource(Base):
    __tablename__ = "disaster_event_sources"
    __table_args__ = (UniqueConstraint("event_id", "url", name="uq_disaster_event_source_url"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("disaster_events.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(500))
    url: Mapped[str] = mapped_column(Text)
    publisher: Mapped[str | None] = mapped_column(String(255), nullable=True)
    accessed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class DataSource(Base):
    __tablename__ = "data_sources"
    __table_args__ = (
        UniqueConstraint("provider", "dataset", "model", name="uq_data_sources_identity"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    provider: Mapped[str] = mapped_column(String(120))
    dataset: Mapped[str] = mapped_column(String(120))
    model: Mapped[str] = mapped_column(String(120), default="")
    license: Mapped[str] = mapped_column(String(120))
    source_url: Mapped[str] = mapped_column(Text)
    available_from: Mapped[date | None] = mapped_column(Date, nullable=True)
    retrieved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class IngestionRun(Base):
    __tablename__ = "ingestion_runs"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    source_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("data_sources.id"))
    status: Mapped[str] = mapped_column(String(20), index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    parameters: Mapped[dict[str, object]] = mapped_column(JSON)
    row_count: Mapped[int] = mapped_column(Integer, default=0)
    raw_response_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)


class ForecastHourly(Base):
    __tablename__ = "forecast_hourly"
    __table_args__ = (
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

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("data_sources.id"))
    location_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("geo_locations.id"), index=True
    )
    ingestion_run_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("ingestion_runs.id")
    )
    product: Mapped[str] = mapped_column(String(40))
    model: Mapped[str] = mapped_column(String(120), default="")
    requested_latitude: Mapped[float] = mapped_column(Float)
    requested_longitude: Mapped[float] = mapped_column(Float)
    grid_latitude: Mapped[float] = mapped_column(Float)
    grid_longitude: Mapped[float] = mapped_column(Float)
    issue_time_utc: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    issue_time_estimated: Mapped[bool] = mapped_column(Boolean, default=False)
    valid_time_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    lead_hours: Mapped[int] = mapped_column(Integer, index=True)
    temperature_2m_c: Mapped[float | None] = mapped_column(Float, nullable=True)
    relative_humidity_2m_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    dew_point_2m_c: Mapped[float | None] = mapped_column(Float, nullable=True)
    precipitation_mm: Mapped[float | None] = mapped_column(Float, nullable=True)
    rain_mm: Mapped[float | None] = mapped_column(Float, nullable=True)
    showers_mm: Mapped[float | None] = mapped_column(Float, nullable=True)
    precipitation_probability_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    surface_pressure_hpa: Mapped[float | None] = mapped_column(Float, nullable=True)
    cloud_cover_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    cape_j_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    wind_speed_10m_kmh: Mapped[float | None] = mapped_column(Float, nullable=True)
    wind_gusts_10m_kmh: Mapped[float | None] = mapped_column(Float, nullable=True)
    soil_moisture_0_to_1cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    soil_moisture_1_to_3cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    soil_moisture_3_to_9cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    soil_moisture_9_to_27cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    soil_moisture_27_to_81cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    quality_flags: Mapped[dict[str, object]] = mapped_column(JSON)
    retrieved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class WeatherObservationHourly(Base):
    __tablename__ = "weather_observation_hourly"
    __table_args__ = (
        UniqueConstraint(
            "source_id", "location_id", "model", "valid_time_utc", name="uq_observation_identity"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("data_sources.id"))
    location_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("geo_locations.id"), index=True
    )
    ingestion_run_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("ingestion_runs.id")
    )
    model: Mapped[str] = mapped_column(String(120), default="")
    requested_latitude: Mapped[float] = mapped_column(Float)
    requested_longitude: Mapped[float] = mapped_column(Float)
    grid_latitude: Mapped[float] = mapped_column(Float)
    grid_longitude: Mapped[float] = mapped_column(Float)
    valid_time_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    temperature_2m_c: Mapped[float | None] = mapped_column(Float, nullable=True)
    relative_humidity_2m_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    dew_point_2m_c: Mapped[float | None] = mapped_column(Float, nullable=True)
    precipitation_mm: Mapped[float | None] = mapped_column(Float, nullable=True)
    rain_mm: Mapped[float | None] = mapped_column(Float, nullable=True)
    showers_mm: Mapped[float | None] = mapped_column(Float, nullable=True)
    surface_pressure_hpa: Mapped[float | None] = mapped_column(Float, nullable=True)
    cloud_cover_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    cape_j_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    wind_speed_10m_kmh: Mapped[float | None] = mapped_column(Float, nullable=True)
    wind_gusts_10m_kmh: Mapped[float | None] = mapped_column(Float, nullable=True)
    soil_moisture_0_to_1cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    soil_moisture_1_to_3cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    soil_moisture_3_to_9cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    soil_moisture_9_to_27cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    soil_moisture_27_to_81cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    soil_moisture_0_to_7cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    soil_moisture_7_to_28cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    soil_moisture_28_to_100cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    soil_moisture_100_to_255cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    quality_flags: Mapped[dict[str, object]] = mapped_column(JSON)
    retrieved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class EventFeature(Base):
    __tablename__ = "event_features"
    __table_args__ = (
        UniqueConstraint(
            "event_id",
            "location_id",
            "source_id",
            "model",
            "lead_hours",
            name="uq_event_feature_identity",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("disaster_events.id"))
    location_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("geo_locations.id"))
    source_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("data_sources.id"))
    model: Mapped[str] = mapped_column(String(120), default="")
    lead_hours: Mapped[int] = mapped_column(Integer)
    rain_1h_max_mm: Mapped[float | None] = mapped_column(Float, nullable=True)
    rain_3h_mm: Mapped[float | None] = mapped_column(Float, nullable=True)
    rain_6h_mm: Mapped[float | None] = mapped_column(Float, nullable=True)
    rain_24h_mm: Mapped[float | None] = mapped_column(Float, nullable=True)
    rain_72h_mm: Mapped[float | None] = mapped_column(Float, nullable=True)
    antecedent_7d_mm: Mapped[float | None] = mapped_column(Float, nullable=True)
    feature_values: Mapped[dict[str, object]] = mapped_column(JSON)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
