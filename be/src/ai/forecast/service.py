import asyncio
from enum import Enum
from typing import Any

import httpx
from pydantic import BaseModel

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
from core.config import Settings


class OpenMeteoFamily(Enum):
    FORECAST = "forecast"
    ELEVATION = "elevation"
    GEOCODING = "geocoding"
    ENSEMBLE = "ensemble"
    HISTORICAL_WEATHER = "historical_weather"
    PREVIOUS_RUNS = "previous_runs"
    HISTORICAL_FORECAST = "historical_forecast"
    FLOOD = "flood"


class OpenMeteoService:
    """Typed, real HTTP adapter for the eight Open-Meteo API families used by the app."""

    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None) -> None:
        self.settings = settings
        self.client = client
        self.base_urls: dict[OpenMeteoFamily, str] = {
            OpenMeteoFamily.FORECAST: settings.open_meteo_forecast_url,
            OpenMeteoFamily.ELEVATION: settings.open_meteo_elevation_url,
            OpenMeteoFamily.GEOCODING: settings.open_meteo_geocoding_url,
            OpenMeteoFamily.ENSEMBLE: settings.open_meteo_ensemble_url,
            OpenMeteoFamily.HISTORICAL_WEATHER: settings.open_meteo_historical_weather_url,
            OpenMeteoFamily.PREVIOUS_RUNS: settings.open_meteo_previous_runs_url,
            OpenMeteoFamily.HISTORICAL_FORECAST: settings.open_meteo_historical_forecast_url,
            OpenMeteoFamily.FLOOD: settings.open_meteo_flood_url,
        }

    async def forecast(self, request: ForecastRequest) -> dict[str, Any]:
        return await self._get(OpenMeteoFamily.FORECAST, self._encode(request))

    async def elevation(self, request: ElevationRequest) -> dict[str, Any]:
        return await self._get(OpenMeteoFamily.ELEVATION, self._encode(request))

    async def geocoding(self, request: GeocodingRequest) -> dict[str, Any]:
        return await self._get(OpenMeteoFamily.GEOCODING, self._encode(request))

    async def ensemble(self, request: EnsembleRequest) -> dict[str, Any]:
        return await self._get(OpenMeteoFamily.ENSEMBLE, self._encode(request))

    async def historical_weather(self, request: HistoricalWeatherRequest) -> dict[str, Any]:
        return await self._get(OpenMeteoFamily.HISTORICAL_WEATHER, self._encode(request))

    async def previous_runs(self, request: PreviousRunRequest) -> dict[str, Any]:
        return await self._get(OpenMeteoFamily.PREVIOUS_RUNS, self._encode(request))

    async def historical_forecast(self, request: HistoricalForecastRequest) -> dict[str, Any]:
        return await self._get(OpenMeteoFamily.HISTORICAL_FORECAST, self._encode(request))

    async def flood(self, request: FloodRequest) -> dict[str, Any]:
        return await self._get(OpenMeteoFamily.FLOOD, self._encode(request))

    async def _get(self, family: OpenMeteoFamily, params: dict[str, Any]) -> dict[str, Any]:
        url = self.base_urls[family]
        if self.settings.open_meteo_api_key:
            params["apikey"] = self.settings.open_meteo_api_key

        if self.client is not None:
            return await self._request_with_retry(self.client, url, params)

        timeout = httpx.Timeout(self.settings.open_meteo_timeout_seconds)
        async with httpx.AsyncClient(timeout=timeout) as client:
            return await self._request_with_retry(client, url, params)

    async def _request_with_retry(
        self,
        client: httpx.AsyncClient,
        url: str,
        params: dict[str, Any],
    ) -> dict[str, Any]:
        attempts = self.settings.open_meteo_retry_attempts
        for attempt in range(attempts):
            try:
                response = await client.get(url, params=params)
            except httpx.RequestError as exc:
                if attempt + 1 == attempts:
                    raise OpenMeteoTransportError(url, str(exc)) from exc
                await asyncio.sleep(0.2 * (2**attempt))
                continue

            if response.status_code == 429 or response.status_code >= 500:
                if attempt + 1 < attempts:
                    await asyncio.sleep(self._retry_delay(response, attempt))
                    continue

            if response.status_code >= 400:
                raise OpenMeteoHTTPError(
                    url,
                    self._extract_error(response),
                    status_code=response.status_code,
                )

            try:
                data = response.json()
            except ValueError as exc:
                raise OpenMeteoPayloadError(url, str(exc)) from exc
            if not isinstance(data, dict):
                raise OpenMeteoPayloadError(url, "response must be a JSON object")
            if data.get("error") is True:
                reason = data.get("reason", "Open-Meteo returned an error payload")
                raise OpenMeteoPayloadError(url, str(reason))
            return data

        raise OpenMeteoTransportError(url, "request attempts exhausted")

    @staticmethod
    def _retry_delay(response: httpx.Response, attempt: int) -> float:
        retry_after = response.headers.get("Retry-After")
        if retry_after is not None:
            try:
                return min(float(retry_after), 5.0)
            except ValueError:
                pass
        return float(0.2 * (2**attempt))

    @staticmethod
    def _extract_error(response: httpx.Response) -> str:
        try:
            body = response.json()
            if isinstance(body, dict):
                reason = body.get("reason")
                if isinstance(reason, str):
                    return reason
        except ValueError:
            pass
        return response.text[:512]

    @staticmethod
    def _encode(request: BaseModel) -> dict[str, Any]:
        payload = request.model_dump(mode="json", by_alias=True, exclude_none=True)
        return {key: OpenMeteoService._encode_value(value) for key, value in payload.items()}

    @staticmethod
    def _encode_value(value: Any) -> Any:
        if isinstance(value, list):
            return ",".join(str(item) for item in value)
        if isinstance(value, float) and value.is_integer():
            return int(value)
        if isinstance(value, bool):
            return "true" if value else "false"
        return value
