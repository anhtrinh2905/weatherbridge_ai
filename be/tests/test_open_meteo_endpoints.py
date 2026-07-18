from typing import Any

import pytest
from ai.forecast.exceptions import OpenMeteoTransportError
from ai.forecast.service import OpenMeteoService
from httpx import AsyncClient

CASES = [
    ("forecast", "forecast", {"latitude": 21, "longitude": 105}),
    ("elevation", "elevation", {"latitude": [21], "longitude": [105]}),
    ("geocoding", "geocoding", {"name": "Hanoi", "countryCode": "VN"}),
    (
        "ensemble",
        "ensemble",
        {
            "latitude": 21,
            "longitude": 105,
            "models": ["icon_seamless"],
            "hourly": ["temperature_2m"],
        },
    ),
    (
        "historical-weather",
        "historical_weather",
        {
            "latitude": 21,
            "longitude": 105,
            "start_date": "2025-01-01",
            "end_date": "2025-01-03",
        },
    ),
    (
        "previous-runs",
        "previous_runs",
        {
            "latitude": 21,
            "longitude": 105,
            "hourly": ["temperature_2m_previous_day1"],
        },
    ),
    (
        "historical-forecast",
        "historical_forecast",
        {
            "latitude": 21,
            "longitude": 105,
            "start_date": "2025-01-01",
            "end_date": "2025-01-03",
        },
    ),
    ("flood", "flood", {"latitude": 21, "longitude": 105}),
]


@pytest.mark.parametrize(("path", "method", "payload"), CASES)
async def test_open_meteo_endpoints_dispatch_to_service(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
    path: str,
    method: str,
    payload: dict[str, Any],
) -> None:
    async def fake_call(_: OpenMeteoService, __: object) -> dict[str, Any]:
        return {"api": path}

    monkeypatch.setattr(OpenMeteoService, method, fake_call)
    response = await client.post(f"/api/v1/open-meteo/{path}", json=payload)
    assert response.status_code == 200
    assert response.json() == {"api": path}


async def test_open_meteo_transport_error_maps_to_503(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def failing_call(_: OpenMeteoService, __: object) -> dict[str, Any]:
        raise OpenMeteoTransportError("forecast", "upstream unavailable")

    monkeypatch.setattr(OpenMeteoService, "forecast", failing_call)
    response = await client.post(
        "/api/v1/open-meteo/forecast",
        json={"latitude": 21, "longitude": 105},
    )
    assert response.status_code == 503
    assert response.json()["code"] == "open_meteo_unavailable"
