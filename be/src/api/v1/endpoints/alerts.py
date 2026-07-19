from uuid import UUID

from fastapi import APIRouter, Depends, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from ai.speech.mms_service import MmsTtsService, SpeechConfigError
from ai.speech.models import SpeechSynthesisRequest
from api.deps import (
    get_ai_job_service,
    get_current_user,
    get_db,
    get_mms_tts_service,
    get_translation_cache_service,
)
from auth.keycloak import CurrentUser
from core.errors import AppError
from modules.alerts.schemas import (
    AcknowledgeAlertRequest,
    AlertCreateRequest,
    AlertInboxItem,
    AlertResponse,
    DeliverySummaryItem,
    PublishAlertResponse,
)
from modules.localization.schemas import (
    AlertLocalizedContentResponse,
    AlertTranslationDraftRequest,
    AlertTranslationGenerateRequest,
    AlertTranslationResponse,
    AlertTranslationReviewRequest,
)
from services.ai_job_service import AiJobService
from services.alert_service import AlertService
from services.localization_service import LocalizationService
from services.translation_service import TranslationCacheService

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


@router.get("/{alert_id}/contents", response_model=list[AlertLocalizedContentResponse])
async def localized_contents(
    alert_id: UUID,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> list[AlertLocalizedContentResponse]:
    return await LocalizationService(session).localized_contents(alert_id, user)


@router.get("/{alert_id}/translations", response_model=list[AlertTranslationResponse])
async def list_translations(
    alert_id: UUID,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> list[AlertTranslationResponse]:
    return await LocalizationService(session).list_alert_translations(alert_id, user)


@router.post(
    "/{alert_id}/translations",
    response_model=AlertTranslationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_translation_draft(
    alert_id: UUID,
    payload: AlertTranslationDraftRequest,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> AlertTranslationResponse:
    return await LocalizationService(session).create_alert_draft(alert_id, payload, user)


@router.post(
    "/{alert_id}/translations/generate",
    response_model=AlertTranslationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def generate_translation_draft(
    alert_id: UUID,
    payload: AlertTranslationGenerateRequest,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
    translation_cache: TranslationCacheService = Depends(get_translation_cache_service),
) -> AlertTranslationResponse:
    return await LocalizationService(session).generate_machine_translation(
        alert_id, payload.locale, user, translation_cache
    )


@router.post("/translations/{translation_id}/review", response_model=AlertTranslationResponse)
async def review_translation(
    translation_id: UUID,
    payload: AlertTranslationReviewRequest,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> AlertTranslationResponse:
    return await LocalizationService(session).review_translation(translation_id, payload, user)


@router.post("/translations/{translation_id}/publish", response_model=AlertLocalizedContentResponse)
async def publish_translation(
    translation_id: UUID,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
    ai_jobs: AiJobService = Depends(get_ai_job_service),
) -> AlertLocalizedContentResponse:
    return await LocalizationService(session, ai_jobs).publish_translation(translation_id, user)


@router.get("/{alert_id}/audio")
async def alert_audio(
    alert_id: UUID,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
    speech: MmsTtsService = Depends(get_mms_tts_service),
) -> Response:
    text, language = await AlertService(session).speech_text(alert_id, user)
    try:
        result = await speech.synthesize(SpeechSynthesisRequest(text=text, language=language))
    except SpeechConfigError as exc:
        raise AppError(503, str(exc), "speech_unavailable") from exc
    return Response(
        content=result.audio,
        media_type=result.media_type,
        headers={"X-Speech-Model": result.model_name},
    )


@router.get("/{alert_id}/delivery-summary", response_model=list[DeliverySummaryItem])
async def delivery_summary(
    alert_id: UUID,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> list[DeliverySummaryItem]:
    return await AlertService(session).delivery_summary(alert_id, user)


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
