from __future__ import annotations

import httpx
import pytest
from ai.forecast.exceptions import (
    OpenMeteoHTTPError,
    OpenMeteoPayloadError,
    OpenMeteoTransportError,
)
from ai.forecast.models import (
    ElevationRequest,
    EnsembleRequest,
    FloodRequest,
    ForecastRequest,
    GeocodingRequest,
    HistoricalForecastRequest,
    HistoricalWeatherRequest,
    PreviousRunRequest,
)
from ai.forecast.service import OpenMeteoService
from core.config import Settings


@pytest.mark.asyncio
async def test_service_encodes_query_params_and_headers() -> None:
    def transport_handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/v1/forecast"
        assert request.url.params["latitude"] == "21"
        assert request.url.params["longitude"] == "105"
        assert request.url.params["daily"] == "precipitation_sum,temperature_2m"
        assert request.url.params["forecast_days"] == "7"
        assert request.url.params["apikey"] == "api-key"
        assert "Authorization" not in request.headers
        return httpx.Response(200, json={"source": "open-meteo"})

    settings = Settings(open_meteo_api_key="api-key")
    request = ForecastRequest(
        latitude=21,
        longitude=105,
        daily=["precipitation_sum", "temperature_2m"],
        forecast_days=7,
    )

    async with httpx.AsyncClient(transport=httpx.MockTransport(transport_handler)) as client:
        service = OpenMeteoService(settings, client=client)
        payload = await service.forecast(request)

    assert payload == {"source": "open-meteo"}


@pytest.mark.asyncio
async def test_service_raises_http_error_for_error_response() -> None:
    def transport_handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(503, json={"reason": "upstream unavailable"})

    async with httpx.AsyncClient(transport=httpx.MockTransport(transport_handler)) as client:
        service = OpenMeteoService(Settings(), client=client)
        with pytest.raises(OpenMeteoHTTPError):
            await service.forecast(ForecastRequest(latitude=10, longitude=20))


@pytest.mark.asyncio
async def test_service_raises_payload_error_for_invalid_json() -> None:
    def transport_handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(200, content=b"not-json")

    async with httpx.AsyncClient(transport=httpx.MockTransport(transport_handler)) as client:
        service = OpenMeteoService(Settings(), client=client)
        with pytest.raises(OpenMeteoPayloadError):
            await service.forecast(ForecastRequest(latitude=10, longitude=20))


@pytest.mark.asyncio
async def test_service_wraps_transport_errors() -> None:
    class FailingClient:
        async def get(self, *_: object, **__: object) -> httpx.Response:
            request = httpx.Request("GET", "https://api.open-meteo.com/v1/forecast")
            raise httpx.ConnectError("connection failed", request=request)

    service = OpenMeteoService(Settings(), client=FailingClient())
    with pytest.raises(OpenMeteoTransportError):
        await service.forecast(ForecastRequest(latitude=10, longitude=20))


@pytest.mark.asyncio
async def test_service_uses_configured_timeout_when_client_created(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured = {}

    class FakeAsyncClient:
        def __init__(self, *args: object, timeout: httpx.Timeout, **kwargs: object) -> None:
            captured["timeout"] = timeout

        async def __aenter__(self) -> FakeAsyncClient:
            return self

        async def __aexit__(self, *_: object) -> None:
            return None

        async def get(self, *_args: object, **_kwargs: object) -> httpx.Response:
            return httpx.Response(200, json={"ok": True})

    def fake_client_factory(*args: object, **kwargs: object) -> FakeAsyncClient:
        return FakeAsyncClient(*args, **kwargs)

    monkeypatch.setattr(httpx, "AsyncClient", fake_client_factory)
    service = OpenMeteoService(Settings(open_meteo_timeout_seconds=31))
    payload = await service.forecast(ForecastRequest(latitude=10, longitude=20))

    assert payload == {"ok": True}
    assert isinstance(captured["timeout"], httpx.Timeout)
    assert captured["timeout"].read == 31


@pytest.mark.asyncio
@pytest.mark.parametrize(
    (
        "method",
        "expected_path",
        "request_model",
    ),
    [
        (
            "forecast",
            "/v1/forecast",
            ForecastRequest(latitude=21, longitude=105),
        ),
        (
            "elevation",
            "/v1/elevation",
            ElevationRequest(latitude=[21.0], longitude=[105.0]),
        ),
        (
            "geocoding",
            "/v1/search",
            GeocodingRequest(name="Hanoi"),
        ),
        (
            "ensemble",
            "/v1/ensemble",
            EnsembleRequest(
                latitude=21,
                longitude=105,
                models=["icon_seamless"],
                hourly=["temperature_2m"],
            ),
        ),
        (
            "historical_weather",
            "/v1/archive",
            HistoricalWeatherRequest(
                latitude=21,
                longitude=105,
                start_date="2025-01-01",
                end_date="2025-01-03",
            ),
        ),
        (
            "previous_runs",
            "/v1/forecast",
            PreviousRunRequest(
                latitude=21,
                longitude=105,
                hourly=["temperature_2m_previous_day1"],
            ),
        ),
        (
            "historical_forecast",
            "/v1/forecast",
            HistoricalForecastRequest(
                latitude=21,
                longitude=105,
                start_date="2025-01-01",
                end_date="2025-01-03",
            ),
        ),
        (
            "flood",
            "/v1/flood",
            FloodRequest(latitude=21, longitude=105),
        ),
    ],
)
async def test_service_uses_expected_family_endpoint(
    method: str, expected_path: str, request_model: object
) -> None:
    def transport_handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == expected_path
        return httpx.Response(200, json={"source": method})

    async with httpx.AsyncClient(transport=httpx.MockTransport(transport_handler)) as client:
        service = OpenMeteoService(Settings(), client=client)
        response = await getattr(service, method)(request_model)  # type: ignore[arg-type]

    assert response == {"source": method}


@pytest.mark.asyncio
async def test_service_retries_transient_status() -> None:
    attempts = 0

    def transport_handler(_: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        if attempts < 3:
            return httpx.Response(503, json={"reason": "retry"})
        return httpx.Response(200, json={"ok": True})

    settings = Settings(open_meteo_retry_attempts=3)
    async with httpx.AsyncClient(transport=httpx.MockTransport(transport_handler)) as client:
        service = OpenMeteoService(settings, client=client)
        response = await service.forecast(ForecastRequest(latitude=21, longitude=105))

    assert response == {"ok": True}
    assert attempts == 3


@pytest.mark.asyncio
async def test_geocoding_uses_country_code_alias() -> None:
    def transport_handler(request: httpx.Request) -> httpx.Response:
        assert request.url.params["countryCode"] == "VN"
        assert "country_code" not in request.url.params
        return httpx.Response(200, json={"results": []})

    async with httpx.AsyncClient(transport=httpx.MockTransport(transport_handler)) as client:
        service = OpenMeteoService(Settings(), client=client)
        await service.geocoding(GeocodingRequest(name="Dien Bien", countryCode="VN"))


@pytest.mark.asyncio
async def test_service_rejects_non_object_json() -> None:
    def transport_handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=[])

    async with httpx.AsyncClient(transport=httpx.MockTransport(transport_handler)) as client:
        service = OpenMeteoService(Settings(), client=client)
        with pytest.raises(OpenMeteoPayloadError):
            await service.forecast(ForecastRequest(latitude=21, longitude=105))
