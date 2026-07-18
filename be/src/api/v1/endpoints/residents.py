from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user
from auth.keycloak import CurrentUser
from core.config import Settings, get_settings
from database.session import get_db
from modules.residents.schemas import (
    ContactCreateRequest,
    ContactResponse,
    ContactUpdateRequest,
    LinkResidentAccountRequest,
    ResidentCreateRequest,
    ResidentDetailResponse,
    ResidentLocationResponse,
    ResidentPointRequest,
    ResidentResponse,
    SupportNeedRequest,
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


@router.get("/{resident_id}", response_model=ResidentDetailResponse)
async def get_resident(resident_id: UUID, user: CurrentUser = Depends(get_current_user), session: AsyncSession = Depends(get_db), settings: Settings = Depends(get_settings)) -> ResidentDetailResponse:
    return await ResidentService(session, settings).resident_detail(resident_id, user)


@router.post("/{resident_id}/contacts", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
async def add_contact(resident_id: UUID, payload: ContactCreateRequest, user: CurrentUser = Depends(get_current_user), session: AsyncSession = Depends(get_db), settings: Settings = Depends(get_settings)) -> ContactResponse:
    return await ResidentService(session, settings).add_contact(resident_id, payload, user)


@router.patch("/{resident_id}/contacts/{contact_id}", response_model=ContactResponse)
async def update_contact(resident_id: UUID, contact_id: UUID, payload: ContactUpdateRequest, user: CurrentUser = Depends(get_current_user), session: AsyncSession = Depends(get_db), settings: Settings = Depends(get_settings)) -> ContactResponse:
    return await ResidentService(session, settings).update_contact(resident_id, contact_id, payload, user)


@router.post("/{resident_id}/locations", response_model=ResidentLocationResponse, status_code=status.HTTP_201_CREATED)
async def add_location(resident_id: UUID, payload: ResidentPointRequest, user: CurrentUser = Depends(get_current_user), session: AsyncSession = Depends(get_db), settings: Settings = Depends(get_settings)) -> ResidentLocationResponse:
    return await ResidentService(session, settings).add_location(resident_id, payload, user)


@router.post("/{resident_id}/support-needs", status_code=status.HTTP_204_NO_CONTENT)
async def add_support_need(resident_id: UUID, payload: SupportNeedRequest, user: CurrentUser = Depends(get_current_user), session: AsyncSession = Depends(get_db), settings: Settings = Depends(get_settings)) -> None:
    await ResidentService(session, settings).add_support_need(resident_id, payload, user)
