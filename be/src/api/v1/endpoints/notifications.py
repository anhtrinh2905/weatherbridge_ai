from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user
from auth.keycloak import CurrentUser
from core.config import Settings, get_settings
from core.errors import AppError
from database.session import get_db
from modules.notifications.schemas import (
    WebPushConfigResponse,
    WebPushSubscriptionRequest,
    WebPushSubscriptionResponse,
)
from services.notification_endpoint_service import NotificationEndpointService

router = APIRouter()


@router.get("/web-push/config", response_model=WebPushConfigResponse)
async def web_push_config(
    _: CurrentUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> WebPushConfigResponse:
    if not settings.web_push_vapid_public_key:
        raise AppError(503, "Web Push is not configured", "web_push_unavailable")
    return WebPushConfigResponse(public_key=settings.web_push_vapid_public_key)


@router.post(
    "/web-push/subscriptions",
    response_model=WebPushSubscriptionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def subscribe_web_push(
    subscription: WebPushSubscriptionRequest,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> WebPushSubscriptionResponse:
    return await NotificationEndpointService(session, settings).upsert_web_push_subscription(
        subscription, user
    )


@router.delete("/web-push/subscriptions/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unsubscribe_web_push(
    contact_id: UUID,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Response:
    await NotificationEndpointService(session, settings).revoke_web_push_subscription(
        contact_id, user
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
