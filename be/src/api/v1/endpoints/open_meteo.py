from collections.abc import Awaitable
from typing import Any

from fastapi import APIRouter, Depends

from ai.forecast import OpenMeteoService
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
from api.deps import get_open_meteo_service, require_roles
from auth.authorization import AppRole
from auth.keycloak import CurrentUser
from core.errors import AppError

router = APIRouter()
operational_user = require_roles(AppRole.ADMIN, AppRole.COMMUNE_OFFICER)


async def _upstream(call: Awaitable[dict[str, Any]]) -> dict[str, Any]:
    try:
        return await call
    except OpenMeteoTransportError as exc:
        raise AppError(503, exc.reason, "open_meteo_unavailable") from exc
    except (OpenMeteoHTTPError, OpenMeteoPayloadError) as exc:
        raise AppError(502, exc.reason, "open_meteo_bad_gateway") from exc


@router.post("/forecast", response_model=dict[str, Any])
async def forecast(
    payload: ForecastRequest,
    service: OpenMeteoService = Depends(get_open_meteo_service),
    _user: CurrentUser = Depends(operational_user),
) -> dict[str, Any]:
    return await _upstream(service.forecast(payload))


@router.post("/elevation", response_model=dict[str, Any])
async def elevation(
    payload: ElevationRequest,
    service: OpenMeteoService = Depends(get_open_meteo_service),
    _user: CurrentUser = Depends(operational_user),
) -> dict[str, Any]:
    return await _upstream(service.elevation(payload))


@router.post("/geocoding", response_model=dict[str, Any])
async def geocoding(
    payload: GeocodingRequest,
    service: OpenMeteoService = Depends(get_open_meteo_service),
    _user: CurrentUser = Depends(operational_user),
) -> dict[str, Any]:
    return await _upstream(service.geocoding(payload))


@router.post("/ensemble", response_model=dict[str, Any])
async def ensemble(
    payload: EnsembleRequest,
    service: OpenMeteoService = Depends(get_open_meteo_service),
    _user: CurrentUser = Depends(operational_user),
) -> dict[str, Any]:
    return await _upstream(service.ensemble(payload))


@router.post("/historical-weather", response_model=dict[str, Any])
async def historical_weather(
    payload: HistoricalWeatherRequest,
    service: OpenMeteoService = Depends(get_open_meteo_service),
    _user: CurrentUser = Depends(operational_user),
) -> dict[str, Any]:
    return await _upstream(service.historical_weather(payload))


@router.post("/previous-runs", response_model=dict[str, Any])
async def previous_runs(
    payload: PreviousRunRequest,
    service: OpenMeteoService = Depends(get_open_meteo_service),
    _user: CurrentUser = Depends(operational_user),
) -> dict[str, Any]:
    return await _upstream(service.previous_runs(payload))


@router.post("/historical-forecast", response_model=dict[str, Any])
async def historical_forecast(
    payload: HistoricalForecastRequest,
    service: OpenMeteoService = Depends(get_open_meteo_service),
    _user: CurrentUser = Depends(operational_user),
) -> dict[str, Any]:
    return await _upstream(service.historical_forecast(payload))


@router.post("/flood", response_model=dict[str, Any])
async def flood(
    payload: FloodRequest,
    service: OpenMeteoService = Depends(get_open_meteo_service),
    _user: CurrentUser = Depends(operational_user),
) -> dict[str, Any]:
    return await _upstream(service.flood(payload))
