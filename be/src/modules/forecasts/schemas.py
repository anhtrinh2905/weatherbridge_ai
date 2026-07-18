from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ForecastDay(BaseModel):
    date: str
    rainfall_mm: float
    peak_intensity_mm_h: float
    min_visibility_m: float | None = None
    temperature_2m_c: float | None = None
    dew_point_2m_c: float | None = None


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
