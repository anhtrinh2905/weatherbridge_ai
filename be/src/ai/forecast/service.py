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
    BASE_URLS: dict[OpenMeteoFamily, str] = {
        OpenMeteoFamily.FORECAST: "https://api.open-meteo.com/v1/forecast",
        OpenMeteoFamily.ELEVATION: "https://api.open-meteo.com/v1/elevation",
        OpenMeteoFamily.GEOCODING: "https://geocoding-api.open-meteo.com/v1/search",
        OpenMeteoFamily.ENSEMBLE: "https://ensemble-api.open-meteo.com/v1/ensemble",
        OpenMeteoFamily.HISTORICAL_WEATHER: "https://archive-api.open-meteo.com/v1/archive",
        OpenMeteoFamily.PREVIOUS_RUNS: "https://previous-runs-api.open-meteo.com/v1/forecast",
        OpenMeteoFamily.HISTORICAL_FORECAST: "https://historical-forecast-api.open-meteo.com/v1/forecast",
        OpenMeteoFamily.FLOOD: "https://flood-api.open-meteo.com/v1/flood",
    }

    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None) -> None:
        self.settings = settings
        self.client = client

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
        url = self.BASE_URLS[family]
        headers: dict[str, str] = {}
        if self.settings.open_meteo_api_key:
            headers["Authorization"] = f"Bearer {self.settings.open_meteo_api_key}"
            headers["apikey"] = self.settings.open_meteo_api_key

        if self.client is not None:
            return await self._request_once(self.client, url, params, headers)

        async with httpx.AsyncClient(timeout=self.settings.open_meteo_timeout_seconds) as client:
            return await self._request_once(client, url, params, headers)

    async def _request_once(
        self,
        client: httpx.AsyncClient,
        url: str,
        params: dict[str, Any],
        headers: dict[str, str],
    ) -> dict[str, Any]:
        try:
            response = await client.get(url, params=params, headers=headers)
        except httpx.RequestError as exc:
            raise OpenMeteoTransportError("http", str(exc)) from exc

        if response.status_code >= 400:
            reason = self._extract_error(response)
            raise OpenMeteoHTTPError(url, reason, status_code=response.status_code)

        try:
            data: dict[str, Any] = response.json()
        except ValueError as exc:
            raise OpenMeteoPayloadError("response_json", str(exc)) from exc
        return data

    def _extract_error(self, response: httpx.Response) -> str:
        try:
            body = response.json()
            if isinstance(body, dict):
                reason = body.get("reason")
                if isinstance(reason, str):
                    return reason
        except ValueError:
            pass
        return response.text[:512]

    def _encode(self, request: BaseModel) -> dict[str, Any]:
        """Convert nested typed models into query params for Open-Meteo."""
        payload = request.model_dump(mode="json", exclude_none=True)
        params: dict[str, Any] = {}
        for key, value in payload.items():
            params[key] = self._encode_value(value)
        return params

    @staticmethod
    def _encode_value(value: Any) -> Any:
        if isinstance(value, list):
            return ",".join(str(item) for item in value)
        if isinstance(value, float) and value.is_integer():
            return int(value)
        if isinstance(value, bool):
            return "true" if value else "false"
        return value
