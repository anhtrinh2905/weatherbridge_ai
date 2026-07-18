from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user
from auth.keycloak import CurrentUser
from core.config import Settings, get_settings
from database.session import get_db
from modules.residents.schemas import (
    HouseholdCreateRequest,
    HouseholdMemberRequest,
    HouseholdResponse,
)
from services.resident_service import ResidentService

router = APIRouter()


@router.get("", response_model=list[HouseholdResponse])
async def list_households(
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> list[HouseholdResponse]:
    return await ResidentService(session, settings).list_households(user)


@router.post("", response_model=HouseholdResponse, status_code=status.HTTP_201_CREATED)
async def create_household(
    payload: HouseholdCreateRequest,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> HouseholdResponse:
    return await ResidentService(session, settings).create_household(payload, user)


@router.post("/{household_id}/members", response_model=HouseholdResponse)
async def add_household_member(
    household_id: UUID,
    payload: HouseholdMemberRequest,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> HouseholdResponse:
    return await ResidentService(session, settings).add_household_member(
        household_id, payload, user
    )
