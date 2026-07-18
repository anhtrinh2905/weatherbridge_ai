from __future__ import annotations

import json

import httpx

from ai.translation.exceptions import (
    TranslationConfigError,
    TranslationHTTPError,
    TranslationTransportError,
)
from ai.translation.models import TranslationRequest, TranslationResponse
from core.config import Settings

_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions"


class OpenAITranslateService:
    """LLM-based translation fallback for when Google Cloud Translation isn't reachable
    (e.g. the Cloud Translation API isn't enabled on the GCP project yet).

    Quality caveat carries over from the NMT path (see GoogleTranslateService): for a
    low-resource language like Hmong, output must be labeled machine-translated and reviewed
    by a local speaker before being trusted for real warnings — this provider is not more
    authoritative than the NMT one, just an available alternative.
    """

    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None) -> None:
        self.settings = settings
        self._client = client

    async def translate(self, request: TranslationRequest) -> TranslationResponse:
        if not self.settings.openai_api_key:
            raise TranslationConfigError("OPENAI_API_KEY is not set.")

        numbered = "\n".join(f"{i + 1}. {text}" for i, text in enumerate(request.texts))
        payload = {
            "model": self.settings.openai_model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        f"Translate each numbered line from {request.source_language} into "
                        f"{request.target_language}. Preserve any {{placeholder}} tokens "
                        "unchanged (do not translate their contents). Respond with strict JSON "
                        '{"translations": ["...", ...]} containing exactly one entry per input '
                        "line, in the same order, with no extra commentary."
                    ),
                },
                {"role": "user", "content": numbered},
            ],
            "temperature": 0,
            "response_format": {"type": "json_object"},
        }

        client = self._client or httpx.AsyncClient(timeout=60)
        owns_client = self._client is None
        try:
            response = await client.post(
                _CHAT_COMPLETIONS_URL,
                headers={
                    "Authorization": f"Bearer {self.settings.openai_api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
        except httpx.HTTPError as exc:
            raise TranslationTransportError(str(exc)) from exc
        finally:
            if owns_client:
                await client.aclose()

        if response.status_code >= 400:
            raise TranslationHTTPError(response.status_code, response.text)

        try:
            body = response.json()
            content = body["choices"][0]["message"]["content"]
            translations = json.loads(content)["translations"]
        except (KeyError, IndexError, ValueError) as exc:
            raise TranslationTransportError(f"Unexpected OpenAI payload: {exc}") from exc

        if len(translations) != len(request.texts):
            raise TranslationTransportError(
                f"OpenAI returned {len(translations)} translations for {len(request.texts)} inputs"
            )

        return TranslationResponse(
            translations=translations,
            target_language=request.target_language,
            source_language=request.source_language,
            model_name=self.settings.openai_model,
        )
