from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator

ArchiveProduct = Literal["historical_forecast", "previous_runs", "archive"]


class GeoLocationResponse(BaseModel):
    code: str
    canonical_name: str
    location_type: str
    historical_admin_name: str | None
    current_admin_name: str | None
    latitude: float | None
    longitude: float | None
    uncertainty_m: int | None
    coordinate_confidence: str
    coordinate_source: str | None
    source_url: str | None
    is_sampling_location: bool


class EventLocationResponse(BaseModel):
    code: str
    name: str
    impact_role: str
    confidence: str
    latitude: float | None
    longitude: float | None
    fatalities: int | None
    missing_people: int | None
    injured_people: int | None
    damaged_houses: int | None


class EventSourceResponse(BaseModel):
    title: str
    url: str
    publisher: str | None
    accessed_at: datetime


class DisasterEventResponse(BaseModel):
    code: str
    hazard_type: str
    started_at_utc: datetime
    ended_at_utc: datetime | None
    local_date: date
    description: str
    verification_status: str
    severity: str | None
    locations: list[EventLocationResponse]
    sources: list[EventSourceResponse]


class ArchiveCoverageResponse(BaseModel):
    location_code: str
    product: str
    model: str
    lead_hours: int | None
    first_valid_time: datetime
    last_valid_time: datetime
    row_count: int


class BackfillArchiveRequest(BaseModel):
    start_date: date = date(2021, 3, 23)
    end_date: date = Field(default_factory=date.today)
    products: list[ArchiveProduct] = ["historical_forecast", "previous_runs", "archive"]
    location_codes: list[str] | None = None
    forecast_model: str = "gfs_seamless"
    archive_model: str = "best_match"
    continue_on_error: bool = True

    @model_validator(mode="after")
    def validate_dates(self) -> "BackfillArchiveRequest":
        if self.start_date > self.end_date:
            raise ValueError("start_date must be on or before end_date")
        return self
