from datetime import datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import JSON, DateTime, Float, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from database.base import Base


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
    payload: Mapped[dict] = mapped_column(JSON)
    result: Mapped[dict | None] = mapped_column(JSON, nullable=True)
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
    days: Mapped[list] = mapped_column(JSON)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
