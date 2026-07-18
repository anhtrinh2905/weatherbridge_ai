from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user
from auth.keycloak import CurrentUser
from core.config import Settings, get_settings
from database.session import get_db
from modules.residents.schemas import (
    LinkResidentAccountRequest,
    ResidentCreateRequest,
    ResidentResponse,
)
from services.resident_service import ResidentService

router = APIRouter()


@router.get("", response_model=list[ResidentResponse])
async def list_residents(
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> list[ResidentResponse]:
    return await ResidentService(session, settings).list_residents(user)


@router.post("", response_model=ResidentResponse, status_code=status.HTTP_201_CREATED)
async def create_resident(
    payload: ResidentCreateRequest,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> ResidentResponse:
    return await ResidentService(session, settings).create_resident(payload, user)


@router.post("/{resident_id}/link-account", response_model=ResidentResponse)
async def link_resident_account(
    resident_id: UUID,
    payload: LinkResidentAccountRequest,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> ResidentResponse:
    return await ResidentService(session, settings).link_account(resident_id, payload, user)
