from fastapi import APIRouter, Depends, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user
from auth.keycloak import CurrentUser
from core.config import Settings, get_settings
from database.session import get_db
from modules.residents.schemas import SubscriptionCreateRequest, SubscriptionResponse
from services.resident_service import ResidentService

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
