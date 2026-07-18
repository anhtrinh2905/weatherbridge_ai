from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class OpenMeteoRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class DateRangeRequest(OpenMeteoRequest):
    start_date: date
    end_date: date

    @model_validator(mode="after")
    def validate_range(self) -> "DateRangeRequest":
        if self.start_date > self.end_date:
            raise ValueError("start_date must be <= end_date")
        if (self.end_date - self.start_date).days > 3650:
            raise ValueError("date window cannot exceed 3650 days")
        return self


class OpenMeteoCoordinates(OpenMeteoRequest):
    latitude: float = Field(ge=-90, le=90, description="Latitude in WGS84 decimal degrees")
    longitude: float = Field(ge=-180, le=180, description="Longitude in WGS84 decimal degrees")


class WeatherVariables(OpenMeteoCoordinates):
    timezone: str = Field(default="UTC", min_length=1)
    daily: list[str] | None = Field(default=None, min_length=1)
    hourly: list[str] | None = Field(default=None, min_length=1)
    current: list[str] | None = Field(default=None, min_length=1)
    models: list[str] | None = Field(default=None, min_length=1)
    elevation: float | None = None
    temperature_unit: Literal["celsius", "fahrenheit"] | None = None
    wind_speed_unit: Literal["kmh", "ms", "mph", "kn"] | None = None
    precipitation_unit: Literal["mm", "inch"] | None = None
    timeformat: Literal["iso8601", "unixtime"] = "iso8601"
    cell_selection: Literal["land", "sea", "nearest"] | None = None


class ForecastRequest(WeatherVariables):
    forecast_days: int = Field(default=7, ge=1, le=16)
    past_days: int | None = Field(default=None, ge=0, le=92)


class EnsembleRequest(OpenMeteoCoordinates):
    models: list[str] = Field(min_length=1)
    hourly: list[str] = Field(min_length=1)
    timezone: str = Field(default="UTC", min_length=1)
    elevation: float | None = None
    temperature_unit: Literal["celsius", "fahrenheit"] | None = None
    wind_speed_unit: Literal["kmh", "ms", "mph", "kn"] | None = None
    precipitation_unit: Literal["mm", "inch"] | None = None
    timeformat: Literal["iso8601", "unixtime"] = "iso8601"
    cell_selection: Literal["land", "sea", "nearest"] | None = None
    forecast_days: int = Field(default=7, ge=1, le=35)
    past_days: int | None = Field(default=None, ge=0, le=92)


class PreviousRunRequest(OpenMeteoCoordinates):
    hourly: list[str] = Field(min_length=1)
    models: list[str] | None = Field(default=None, min_length=1)
    timezone: str = Field(default="UTC", min_length=1)
    forecast_days: int = Field(default=1, ge=1, le=16)
    past_days: int | None = Field(default=0, ge=0, le=92)


class HistoricalWeatherRequest(WeatherVariables, DateRangeRequest):
    current: None = None


class HistoricalForecastRequest(WeatherVariables, DateRangeRequest):
    current: None = None


class GeocodingRequest(OpenMeteoRequest):
    name: str = Field(min_length=1, max_length=200)
    count: int = Field(default=10, ge=1, le=100)
    language: str = Field(default="en", min_length=2, max_length=10)
    format: Literal["json"] = "json"
    country_code: str | None = Field(
        default=None,
        alias="countryCode",
        min_length=2,
        max_length=2,
    )


class ElevationRequest(OpenMeteoRequest):
    latitude: list[float] = Field(min_length=1, max_length=100)
    longitude: list[float] = Field(min_length=1, max_length=100)

    @model_validator(mode="after")
    def validate_coordinates(self) -> "ElevationRequest":
        if len(self.latitude) != len(self.longitude):
            raise ValueError("latitude and longitude must have the same length")
        if any(value < -90 or value > 90 for value in self.latitude):
            raise ValueError("latitude values must be between -90 and 90")
        if any(value < -180 or value > 180 for value in self.longitude):
            raise ValueError("longitude values must be between -180 and 180")
        return self


class FloodRequest(OpenMeteoCoordinates):
    daily: list[str] = Field(default_factory=lambda: ["river_discharge"], min_length=1)
    forecast_days: int = Field(default=92, ge=1, le=210)
    past_days: int | None = Field(default=None, ge=0, le=92)
    start_date: date | None = None
    end_date: date | None = None
    ensemble: bool = False
    timeformat: Literal["iso8601", "unixtime"] = "iso8601"
    cell_selection: Literal["land", "sea", "nearest"] | None = None

    @model_validator(mode="after")
    def validate_optional_range(self) -> "FloodRequest":
        if (self.start_date is None) != (self.end_date is None):
            raise ValueError("start_date and end_date must be provided together")
        if self.start_date is not None and self.end_date is not None:
            if self.start_date > self.end_date:
                raise ValueError("start_date must be <= end_date")
        return self
