from typing import Annotated

from fastapi import APIRouter, Depends, Response

from ai.speech.mms_service import MmsTtsService, SpeechConfigError
from ai.speech.models import SpeechSynthesisRequest
from api.deps import get_mms_tts_service
from core.errors import AppError

router = APIRouter(prefix="/internal/speech", tags=["internal"])

@router.post("/synthesize")
async def synthesize_speech(
    request: SpeechSynthesisRequest,
    speech: Annotated[MmsTtsService, Depends(get_mms_tts_service)],
) -> Response:
    """Internal endpoint for worker to generate TTS audio without auth overhead."""
    try:
        result = await speech.synthesize(request)
    except SpeechConfigError as exc:
        raise AppError(503, str(exc), "speech_unavailable") from exc

    return Response(
        content=result.audio,
        media_type=result.media_type,
        headers={"X-Speech-Model": result.model_name},
    )
