from fastapi import APIRouter, Depends

from ai.translation.exceptions import (
    TranslationConfigError,
    TranslationHTTPError,
    TranslationTransportError,
)
from ai.translation.models import TranslationRequest, TranslationResponse
from api.deps import get_current_user, get_translation_cache_service
from auth.keycloak import CurrentUser
from core.errors import AppError
from services.translation_service import TranslationCacheService

router = APIRouter()


@router.post("", response_model=TranslationResponse)
async def translate(
    payload: TranslationRequest,
    service: TranslationCacheService = Depends(get_translation_cache_service),
    _user: CurrentUser = Depends(get_current_user),
) -> TranslationResponse:
    """Live translation for dynamic content (alert bulletins, etc.), Redis-cached by content
    hash. Static UI chrome does NOT go through this endpoint — see scripts/generate_hmong_locale.py
    and fe/src/shared/i18n/ for that offline path.
    """
    try:
        return await service.translate(payload)
    except TranslationConfigError as exc:
        raise AppError(503, str(exc), "translation_unavailable") from exc
    except TranslationTransportError as exc:
        raise AppError(503, str(exc), "translation_unavailable") from exc
    except TranslationHTTPError as exc:
        raise AppError(502, str(exc), "translation_bad_gateway") from exc
