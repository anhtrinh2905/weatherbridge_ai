from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ForecastDay(BaseModel):
    date: str
    rainfall_mm: float
    peak_intensity_mm_h: float


class ForecastSnapshotResponse(BaseModel):
    id: UUID
    location_code: str
    latitude: float
    longitude: float
    source: str
    days: list[ForecastDay]
    fetched_at: datetime


class ForecastRefreshResponse(BaseModel):
    job_id: UUID
    status: str
