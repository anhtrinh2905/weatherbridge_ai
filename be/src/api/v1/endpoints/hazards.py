from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user, get_hazard_risk_service
from auth.keycloak import CurrentUser
from core.config import Settings, get_settings
from database.session import get_db
from modules.hazards.schemas import (
    HazardCellResponse,
    HazardManifestResponse,
    HazardRiskResponse,
    HazardType,
)
from services.hazard_risk_service import HazardRiskService
from services.hazard_service import HazardService

router = APIRouter()


@router.get("/manifest", response_model=HazardManifestResponse)
async def manifest(
    hazard_type: HazardType = "dominant",
    forecast_day: date | None = None,
    _: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> HazardManifestResponse:
    return await HazardService(session, settings).manifest(hazard_type, forecast_day)


@router.get("/cell", response_model=HazardCellResponse)
async def inspect_cell(
    latitude: float = Query(ge=-90, le=90),
    longitude: float = Query(ge=-180, le=180),
    hazard_type: HazardType = "dominant",
    forecast_day: date | None = None,
    _: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> HazardCellResponse:
    return await HazardService(session, settings).inspect_cell(
        hazard_type, latitude, longitude, forecast_day
    )


@router.get("/{location_code}/latest", response_model=HazardRiskResponse)
async def latest_hazard_risk(
    location_code: str,
    service: HazardRiskService = Depends(get_hazard_risk_service),
    _user: CurrentUser = Depends(get_current_user),
) -> HazardRiskResponse:
    return await service.latest(location_code)
