from datetime import date, timedelta

import pytest
from ai.forecast.models import (
    ElevationRequest,
    EnsembleRequest,
    FloodRequest,
    ForecastRequest,
    HistoricalWeatherRequest,
)
from pydantic import ValidationError


def test_ensemble_requires_models_and_hourly_variables() -> None:
    with pytest.raises(ValidationError):
        EnsembleRequest(latitude=10, longitude=20)  # type: ignore[call-arg]


def test_forecast_rejects_unknown_arguments() -> None:
    with pytest.raises(ValidationError):
        ForecastRequest(latitude=10, longitude=20, unsupported=True)  # type: ignore[call-arg]


def test_historical_weather_requires_valid_date_range() -> None:
    start = date.today()
    with pytest.raises(ValidationError):
        HistoricalWeatherRequest(
            latitude=10,
            longitude=20,
            start_date=start + timedelta(days=1),
            end_date=start,
        )


def test_flood_supports_long_range_and_validates_dates() -> None:
    request = FloodRequest(latitude=10, longitude=20, forecast_days=210)
    assert request.daily == ["river_discharge"]

    with pytest.raises(ValidationError):
        FloodRequest(latitude=10, longitude=20, start_date="2026-01-01")


def test_elevation_rejects_payload_api_key() -> None:
    with pytest.raises(ValidationError):
        ElevationRequest(latitude=[10], longitude=[20], apikey="leak")  # type: ignore[call-arg]
