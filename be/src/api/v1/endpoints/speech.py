from fastapi import APIRouter, Depends
from fastapi.responses import Response

from ai.speech.mms_service import MmsTtsService, SpeechConfigError
from ai.speech.models import SpeechSynthesisRequest
from api.deps import get_current_user, get_mms_tts_service
from auth.keycloak import CurrentUser
from core.errors import AppError

router = APIRouter()


@router.post("/mms")
async def synthesize_mms_speech(
    payload: SpeechSynthesisRequest,
    service: MmsTtsService = Depends(get_mms_tts_service),
    _user: CurrentUser = Depends(get_current_user),
) -> Response:
    try:
        result = await service.synthesize(payload)
    except SpeechConfigError as exc:
        raise AppError(503, str(exc), "speech_unavailable") from exc

    return Response(
        content=result.audio,
        media_type=result.media_type,
        headers={"X-Speech-Model": result.model_name},
    )

