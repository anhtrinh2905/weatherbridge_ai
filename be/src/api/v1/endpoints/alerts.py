from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user
from auth.keycloak import CurrentUser
from database.session import get_db
from modules.alerts.schemas import (
    AcknowledgeAlertRequest,
    AlertCreateRequest,
    AlertInboxItem,
    AlertResponse,
    PublishAlertResponse,
)
from services.alert_service import AlertService

router = APIRouter()


@router.get("", response_model=list[AlertResponse])
async def list_alerts(
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> list[AlertResponse]:
    return await AlertService(session).list_alerts(user)


@router.post("", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
async def create_alert(
    payload: AlertCreateRequest,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> AlertResponse:
    return await AlertService(session).create_alert(payload, user)


@router.post("/{alert_id}/submit", response_model=AlertResponse)
async def submit_alert(
    alert_id: UUID,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> AlertResponse:
    return await AlertService(session).submit_alert(alert_id, user)


@router.post("/{alert_id}/publish", response_model=PublishAlertResponse)
async def publish_alert(
    alert_id: UUID,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> PublishAlertResponse:
    return await AlertService(session).publish_alert(alert_id, user)


@router.get("/inbox", response_model=list[AlertInboxItem])
async def alert_inbox(
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> list[AlertInboxItem]:
    return await AlertService(session).inbox(user)


@router.post("/{alert_id}/acknowledgements", response_model=AlertInboxItem)
async def acknowledge_alert(
    alert_id: UUID,
    payload: AcknowledgeAlertRequest,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> AlertInboxItem:
    return await AlertService(session).acknowledge(alert_id, payload, user)
