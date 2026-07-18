from typing import Any

import pytest
from fastapi import FastAPI
from httpx import AsyncClient

from ai.forecast.exceptions import OpenMeteoTransportError
from api.deps import get_open_meteo_service


class FakeOpenMeteoService:
    async def forecast(self, _: object) -> dict[str, Any]:
        return {"api": "forecast"}

    async def elevation(self, _: object) -> dict[str, Any]:
        return {"api": "elevation"}

    async def geocoding(self, _: object) -> dict[str, Any]:
        return {"api": "geocoding"}

    async def ensemble(self, _: object) -> dict[str, Any]:
        return {"api": "ensemble"}

    async def historical_weather(self, _: object) -> dict[str, Any]:
        return {"api": "historical-weather"}

    async def previous_runs(self, _: object) -> dict[str, Any]:
        return {"api": "previous-runs"}

    async def historical_forecast(self, _: object) -> dict[str, Any]:
        return {"api": "historical-forecast"}

    async def flood(self, _: object) -> dict[str, Any]:
        return {"api": "flood"}


CASES = [
    ("forecast", {"latitude": 21, "longitude": 105}, "forecast"),
    ("elevation", {"latitude": [21], "longitude": [105]}, "elevation"),
    ("geocoding", {"name": "Hanoi", "countryCode": "VN"}, "geocoding"),
    (
        "ensemble",
        {
            "latitude": 21,
            "longitude": 105,
            "models": ["icon_seamless"],
            "hourly": ["temperature_2m"],
        },
        "ensemble",
    ),
    (
        "historical-weather",
        {
            "latitude": 21,
            "longitude": 105,
            "start_date": "2025-01-01",
            "end_date": "2025-01-03",
        },
        "historical-weather",
    ),
    (
        "previous-runs",
        {
            "latitude": 21,
            "longitude": 105,
            "hourly": ["temperature_2m_previous_day1"],
        },
        "previous-runs",
    ),
    (
        "historical-forecast",
        {
            "latitude": 21,
            "longitude": 105,
            "start_date": "2025-01-01",
            "end_date": "2025-01-03",
        },
        "historical-forecast",
    ),
    ("flood", {"latitude": 21, "longitude": 105}, "flood"),
]


@pytest.mark.parametrize(("path", "payload", "expected"), CASES)
async def test_open_meteo_endpoints_dispatch_to_service(
    app: FastAPI,
    client: AsyncClient,
    path: str,
    payload: dict[str, Any],
    expected: str,
) -> None:
    app.dependency_overrides[get_open_meteo_service] = FakeOpenMeteoService
    response = await client.post(f"/api/v1/open-meteo/{path}", json=payload)
    assert response.status_code == 200
    assert response.json() == {"api": expected}


async def test_open_meteo_transport_error_maps_to_503(
    app: FastAPI,
    client: AsyncClient,
) -> None:
    class FailingService(FakeOpenMeteoService):
        async def forecast(self, _: object) -> dict[str, Any]:
            raise OpenMeteoTransportError("forecast", "upstream unavailable")

    app.dependency_overrides[get_open_meteo_service] = FailingService
    response = await client.post(
        "/api/v1/open-meteo/forecast",
        json={"latitude": 21, "longitude": 105},
    )
    assert response.status_code == 503
    assert response.json()["code"] == "open_meteo_unavailable"
