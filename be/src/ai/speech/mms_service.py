from __future__ import annotations

import io
from functools import lru_cache
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from numpy.typing import NDArray

from ai.speech.models import SpeechSynthesisRequest, SpeechSynthesisResult
from core.config import Settings


class SpeechConfigError(RuntimeError):
    """Raised when MMS TTS is requested but runtime dependencies/config are missing."""


class MmsTtsService:
    """Optional local MMS TTS wrapper.

    The API process can start without heavy ML packages installed. When `transformers`,
    `torch`, and `scipy` are present, this synthesizes Hmong speech with MMS and returns WAV.
    """

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def synthesize(self, request: SpeechSynthesisRequest) -> SpeechSynthesisResult:
        if request.language not in {"hmn", "mww", "blt", "tai"}:
            raise SpeechConfigError("MMS TTS is currently enabled only for Hmong and Tai text.")

        repo_id = self.settings.mms_tts_repo_id
        subfolder: str | None
        if request.language in {"blt", "tai"}:
            subfolder = "models/blt"
        else:
            subfolder = self.settings.mms_tts_hmong_subfolder or None
            
        synthesizer = _load_synthesizer(repo_id, subfolder)
        audio, sample_rate = synthesizer(request.text)
        return SpeechSynthesisResult(
            audio=_to_wav(audio, sample_rate),
            model_name=f"{repo_id}/{subfolder}" if subfolder else repo_id,
        )


@lru_cache(maxsize=2)
def _load_synthesizer(repo_id: str, subfolder: str | None):
    try:
        import torch
        from transformers import AutoTokenizer, VitsModel
    except ImportError as exc:
        raise SpeechConfigError(
            "MMS TTS dependencies are not installed. Install transformers, torch, and scipy "
            "in the backend image to enable Hmong speech synthesis."
        ) from exc

    kwargs = {"subfolder": subfolder} if subfolder else {}
    tokenizer = AutoTokenizer.from_pretrained(repo_id, **kwargs)
    model = VitsModel.from_pretrained(repo_id, **kwargs)
    model.eval()

    def _synthesize(text: str) -> tuple[NDArray[Any], int]:
        inputs = tokenizer(text, return_tensors="pt")
        with torch.no_grad():
            output = model(**inputs).waveform
        audio = output.squeeze().detach().cpu().numpy()
        return audio, int(model.config.sampling_rate)

    return _synthesize


def _to_wav(audio: NDArray[Any], sample_rate: int) -> bytes:
    try:
        from scipy.io.wavfile import write as wav_write
    except ImportError as exc:
        raise SpeechConfigError(
            "MMS TTS audio encoding requires scipy in the backend image."
        ) from exc

    buffer = io.BytesIO()
    wav_write(buffer, sample_rate, audio)
    return buffer.getvalue()
