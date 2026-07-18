from datetime import date

from pydantic import BaseModel, Field, model_validator


class _DateRangeMixin(BaseModel):
    start_date: date
    end_date: date

    @model_validator(mode="after")
    def validate_range(self) -> "_DateRangeMixin":
        if self.start_date > self.end_date:
            raise ValueError("start_date must be <= end_date")
        if (self.end_date - self.start_date).days > 3650:
            raise ValueError("date window cannot exceed 3650 days")
        return self


class OpenMeteoCoordinates(BaseModel):
    latitude: float = Field(ge=-90, le=90, description="Latitude in WGS84 decimal degrees")
    longitude: float = Field(ge=-180, le=180, description="Longitude in WGS84 decimal degrees")


class BaseOpenMeteoWeatherRequest(OpenMeteoCoordinates):
    """Shared args for weather-like endpoints."""

    timezone: str = Field(default="UTC", min_length=1)
    daily: list[str] | None = Field(default=None, min_length=1)
    hourly: list[str] | None = Field(default=None, min_length=1)
    current: list[str] | None = Field(default=None, min_length=1)
    model: str | None = None
    models: list[str] | None = Field(default=None, min_length=1)
    temperature_unit: str | None = None
    wind_speed_unit: str | None = None
    precipitation_unit: str | None = None


class ForecastRequest(BaseOpenMeteoWeatherRequest):
    forecast_days: int = Field(default=7, ge=1, le=16)
    past_days: int | None = Field(default=None, ge=0, le=120)


class EnsembleRequest(BaseOpenMeteoWeatherRequest):
    mode: str = Field(default="members")
    forecast_days: int = Field(default=7, ge=1, le=16)
    past_days: int | None = Field(default=None, ge=0, le=120)

    @model_validator(mode="after")
    def validate_mode(self) -> "EnsembleRequest":
        if self.mode not in {"mean", "members"}:
            raise ValueError('mode must be either "mean" or "members"')
        return self


class PreviousRunRequest(BaseOpenMeteoWeatherRequest):
    forecast_days: int = Field(default=1, ge=1, le=16)
    past_days: int | None = Field(default=0, ge=0, le=120)


class HistoricalWeatherRequest(BaseOpenMeteoWeatherRequest, _DateRangeMixin):
    pass


class HistoricalForecastRequest(_DateRangeMixin, BaseOpenMeteoWeatherRequest):
    pass


class GeocodingRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    count: int = Field(default=10, ge=1, le=100)
    language: str = Field(default="en")
    format: str = Field(default="json")
    country_code: str | None = Field(default=None, min_length=2, max_length=2)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)


class ElevationRequest(BaseModel):
    latitude: list[float] = Field(min_length=1, max_length=100)
    longitude: list[float] = Field(min_length=1, max_length=100)
    apikey: str | None = None

    @model_validator(mode="after")
    def validate_coordinates(self) -> "ElevationRequest":
        if len(self.latitude) != len(self.longitude):
            raise ValueError("latitude and longitude must have the same length")

        for value in self.latitude:
            if value < -90 or value > 90:
                raise ValueError(f"Latitude must be between -90 and 90, got {value}")
        for value in self.longitude:
            if value < -180 or value > 180:
                raise ValueError(f"Longitude must be between -180 and 180, got {value}")
        return self


class FloodRequest(BaseOpenMeteoWeatherRequest):
    forecast_days: int = Field(default=1, ge=1, le=16)
    past_days: int | None = Field(default=None, ge=0, le=120)
