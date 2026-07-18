from fastapi import APIRouter, Depends, status

from api.deps import get_current_user, get_forecast_service, require_roles
from auth.authorization import AppRole
from auth.keycloak import CurrentUser
from modules.forecasts.schemas import ForecastRefreshResponse, ForecastSnapshotResponse
from services.forecast_service import ForecastService

router = APIRouter()


@router.get("/{location_code}/latest", response_model=ForecastSnapshotResponse)
async def latest_forecast(
    location_code: str,
    service: ForecastService = Depends(get_forecast_service),
    _user: CurrentUser = Depends(get_current_user),
) -> ForecastSnapshotResponse:
    return await service.latest(location_code)


@router.post(
    "/{location_code}/refresh",
    response_model=ForecastRefreshResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def refresh_forecast(
    location_code: str,
    service: ForecastService = Depends(get_forecast_service),
    user: CurrentUser = Depends(require_roles(AppRole.ADMIN, AppRole.COMMUNE_OFFICER)),
) -> ForecastRefreshResponse:
    return await service.refresh(location_code, user.id)
