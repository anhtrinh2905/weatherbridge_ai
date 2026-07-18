from uuid import UUID

from auth.keycloak import CurrentUser
from core.config import Settings, get_settings
from database.session import get_db
from fastapi import APIRouter, Depends, Response, status
from modules.residents.schemas import (
    ConsentResponse,
    SubscriptionCreateRequest,
    SubscriptionResponse,
    SubscriptionUpdateRequest,
)
from pydantic import BaseModel, Field
from services.resident_service import ResidentService
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user

router = APIRouter()


class GrantConsentRequest(BaseModel):
    policy_version: str = Field(min_length=1, max_length=40)


@router.get("", response_model=list[SubscriptionResponse])
async def list_subscriptions(
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> list[SubscriptionResponse]:
    return await ResidentService(session, settings).list_subscriptions(user)


@router.post("", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED)
async def create_subscription(
    payload: SubscriptionCreateRequest,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> SubscriptionResponse:
    return await ResidentService(session, settings).create_subscription(payload, user)


@router.post("/consent", status_code=status.HTTP_204_NO_CONTENT)
async def grant_consent(
    payload: GrantConsentRequest,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Response:
    await ResidentService(session, settings).grant_alert_consent(user, payload.policy_version)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/consent", response_model=list[ConsentResponse])
async def list_consents(
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> list[ConsentResponse]:
    return await ResidentService(session, settings).list_consents(user)


@router.delete("/consent/{consent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def withdraw_consent(
    consent_id: UUID,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Response:
    await ResidentService(session, settings).withdraw_alert_consent(user, consent_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/{subscription_id}", response_model=SubscriptionResponse)
async def update_subscription(
    subscription_id: UUID,
    payload: SubscriptionUpdateRequest,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> SubscriptionResponse:
    return await ResidentService(session, settings).update_subscription(
        subscription_id, payload, user
    )
