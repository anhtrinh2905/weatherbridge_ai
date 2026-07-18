"""Nominatim reverse geocoding (auth-gated proxy).

Open-Meteo geocoding is forward-only. Map click → address needs Nominatim.
Respect usage policy: identifiable User-Agent, no bulk scraping, short cache.
"""

from __future__ import annotations

import time
from typing import Any

import httpx

from core.config import Settings
from core.errors import AppError
from modules.geocode.schemas import ReverseGeocodeRequest, ReverseGeocodeResponse

_CACHE: dict[tuple[float, float], tuple[float, ReverseGeocodeResponse]] = {}
_CACHE_TTL_SECONDS = 300.0
_CACHE_ROUND = 4  # ~11 m — enough to reuse nearby clicks


class GeocodeService:
    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None) -> None:
        self.settings = settings
        self.client = client

    async def reverse(self, request: ReverseGeocodeRequest) -> ReverseGeocodeResponse:
        key = (round(request.latitude, _CACHE_ROUND), round(request.longitude, _CACHE_ROUND))
        cached = _CACHE.get(key)
        now = time.monotonic()
        if cached and now - cached[0] < _CACHE_TTL_SECONDS:
            return cached[1]

        params: dict[str, str | int | float] = {
            "lat": request.latitude,
            "lon": request.longitude,
            "format": "jsonv2",
            "accept-language": "vi,en",
        }
        headers = {
            "User-Agent": "WeatherBridgeAI/1.0 (commune-risk-map; contact=dev@weatherbridge.local)"
        }
        try:
            if self.client is not None:
                response = await self.client.get(
                    self.settings.nominatim_reverse_url, params=params, headers=headers
                )
            else:
                async with httpx.AsyncClient(
                    timeout=self.settings.open_meteo_timeout_seconds
                ) as client:
                    response = await client.get(
                        self.settings.nominatim_reverse_url, params=params, headers=headers
                    )
        except httpx.HTTPError as exc:
            raise AppError(503, "Nominatim unavailable", "geocode_unavailable") from exc

        if response.status_code >= 400:
            raise AppError(502, f"Nominatim HTTP {response.status_code}", "geocode_bad_gateway")

        payload: dict[str, Any] = response.json()
        display_name = str(payload.get("display_name") or "").strip()
        if not display_name:
            raise AppError(404, "No address for coordinates", "geocode_not_found")

        result = ReverseGeocodeResponse(
            displayName=display_name,
            latitude=request.latitude,
            longitude=request.longitude,
        )
        _CACHE[key] = (now, result)
        return result
