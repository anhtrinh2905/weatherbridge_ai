from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user
from auth.keycloak import CurrentUser
from database.session import get_db
from modules.evacuations.schemas import (
    EvacuationAssignmentRequest,
    EvacuationAssignmentResponse,
    EvacuationOrderCreateRequest,
    EvacuationOrderResponse,
    SafetyEventCreateRequest,
    SafetyEventResponse,
    ShelterCreateRequest,
    ShelterResponse,
)
from services.evacuation_service import EvacuationService

router = APIRouter()


@router.get("/shelters", response_model=list[ShelterResponse])
async def list_shelters(
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> list[ShelterResponse]:
    return await EvacuationService(session).list_shelters(user)


@router.post("/shelters", response_model=ShelterResponse, status_code=status.HTTP_201_CREATED)
async def create_shelter(
    payload: ShelterCreateRequest,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> ShelterResponse:
    return await EvacuationService(session).create_shelter(payload, user)


@router.get("/orders", response_model=list[EvacuationOrderResponse])
async def list_orders(
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> list[EvacuationOrderResponse]:
    return await EvacuationService(session).list_orders(user)


@router.post("/orders", response_model=EvacuationOrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: EvacuationOrderCreateRequest,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> EvacuationOrderResponse:
    return await EvacuationService(session).create_order(payload, user)


@router.post("/orders/{order_id}/assignments", response_model=EvacuationAssignmentResponse)
async def assign_evacuation(
    order_id: UUID,
    payload: EvacuationAssignmentRequest,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> EvacuationAssignmentResponse:
    return await EvacuationService(session).assign(order_id, payload, user)


@router.post("/safety-events", response_model=SafetyEventResponse)
async def record_safety(
    payload: SafetyEventCreateRequest,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> SafetyEventResponse:
    return await EvacuationService(session).record_safety(payload, user)
