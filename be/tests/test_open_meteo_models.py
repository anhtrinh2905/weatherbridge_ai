from __future__ import annotations

from datetime import date, timedelta

import pytest
from pydantic import ValidationError

from ai.forecast.models import EnsembleRequest, HistoricalWeatherRequest


def test_ensemble_mode_accepts_only_known_values() -> None:
    with pytest.raises(ValidationError):
        EnsembleRequest(latitude=10, longitude=20, mode="invalid")


def test_historical_weather_requires_valid_date_range() -> None:
    start = date.today()
    with pytest.raises(ValidationError):
        HistoricalWeatherRequest(
            latitude=10,
            longitude=20,
            start_date=start + timedelta(days=1),
            end_date=start,
        )
