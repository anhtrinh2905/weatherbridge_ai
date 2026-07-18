from __future__ import annotations

import asyncio
import json
import time
from collections.abc import Awaitable, Callable
from pathlib import Path
from typing import Any

import httpx
import jwt

from ai.translation.exceptions import (
    TranslationConfigError,
    TranslationHTTPError,
    TranslationTransportError,
)
from ai.translation.models import TranslationRequest, TranslationResponse
from core.config import Settings

_SCOPE = "https://www.googleapis.com/auth/cloud-platform"
_TOKEN_TTL_SECONDS = 3600


class GeminiTranslateService:
    """LLM-based translation via Gemini on Vertex AI, using the same service-account key as
    GoogleTranslateService (GOOGLE_TRANSLATE_CREDENTIALS_PATH) but a different Google Cloud API
    (aiplatform.googleapis.com instead of translate.googleapis.com) and OAuth scope — useful when
    Cloud Translation isn't enabled on the project but Vertex AI already is.

    Same quality caveat as the other LLM-based provider (OpenAITranslateService): for a
    low-resource language like Hmong, label output as machine-translated and have a local
    speaker review it before treating it as authoritative.
    """

    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None) -> None:
        self.settings = settings
        self._client = client
        self._cached_token: str | None = None
        self._cached_token_expiry = 0.0
        self._cached_project_id: str | None = None

    async def translate(self, request: TranslationRequest) -> TranslationResponse:
        token, project_id = await self._get_access_token_and_project()

        numbered = "\n".join(f"{i + 1}. {text}" for i, text in enumerate(request.texts))
        prompt = (
            f"Translate each numbered line from {request.source_language} into "
            f"{request.target_language}. Preserve any {{placeholder}} tokens unchanged "
            "(do not translate their contents). Respond with strict JSON "
            '{"translations": ["...", ...]} containing exactly one entry per input line, '
            f"in the same order, no extra commentary.\n\n{numbered}"
        )
        location = self.settings.vertex_location
        model = self.settings.vertex_gemini_model
        url = (
            f"https://{location}-aiplatform.googleapis.com/v1/projects/{project_id}/"
            f"locations/{location}/publishers/google/models/{model}:generateContent"
        )
        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"responseMimeType": "application/json", "temperature": 0},
        }

        async def _call(client: httpx.AsyncClient) -> httpx.Response:
            return await client.post(
                url,
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json=payload,
            )

        response = await self._request(_call)

        try:
            body = response.json()
            text = body["candidates"][0]["content"]["parts"][0]["text"]
            translations = json.loads(text)["translations"]
        except (KeyError, IndexError, ValueError) as exc:
            raise TranslationTransportError(f"Unexpected Gemini payload: {exc}") from exc

        if len(translations) != len(request.texts):
            raise TranslationTransportError(
                f"Gemini returned {len(translations)} translations for {len(request.texts)} inputs"
            )

        return TranslationResponse(
            translations=translations,
            target_language=request.target_language,
            source_language=request.source_language,
            model_name=model,
        )

    async def _get_access_token_and_project(self) -> tuple[str, str]:
        now = time.time()
        if self._cached_token and self._cached_project_id and now < self._cached_token_expiry - 60:
            return self._cached_token, self._cached_project_id

        if not self.settings.google_translate_credentials_path:
            raise TranslationConfigError(
                "GOOGLE_TRANSLATE_CREDENTIALS_PATH is not set — cannot authenticate to Vertex AI."
            )

        iat = int(now)
        key_data, assertion = await asyncio.to_thread(
            self._sign_assertion, self.settings.google_translate_credentials_path, iat
        )

        async def _call(client: httpx.AsyncClient) -> httpx.Response:
            return await client.post(
                key_data["token_uri"],
                data={
                    "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                    "assertion": assertion,
                },
            )

        response = await self._request(_call)
        token_payload = response.json()
        self._cached_token = token_payload["access_token"]
        self._cached_token_expiry = iat + int(token_payload.get("expires_in", _TOKEN_TTL_SECONDS))
        self._cached_project_id = key_data["project_id"]
        return self._cached_token, self._cached_project_id

    @staticmethod
    def _sign_assertion(credentials_path: str, iat: int) -> tuple[dict[str, Any], str]:
        key_path = Path(credentials_path)
        if not key_path.is_file():
            raise TranslationConfigError(f"Service account key not found at {key_path}")

        key_data: dict[str, Any] = json.loads(key_path.read_text(encoding="utf-8"))
        assertion = jwt.encode(
            {
                "iss": key_data["client_email"],
                "scope": _SCOPE,
                "aud": key_data["token_uri"],
                "iat": iat,
                "exp": iat + _TOKEN_TTL_SECONDS,
            },
            key_data["private_key"],
            algorithm="RS256",
        )
        return key_data, assertion

    async def _request(
        self, call: Callable[[httpx.AsyncClient], Awaitable[httpx.Response]]
    ) -> httpx.Response:
        client = self._client or httpx.AsyncClient(timeout=60)
        owns_client = self._client is None
        try:
            response = await call(client)
        except httpx.HTTPError as exc:
            raise TranslationTransportError(str(exc)) from exc
        finally:
            if owns_client:
                await client.aclose()

        if response.status_code >= 400:
            raise TranslationHTTPError(response.status_code, response.text)
        return response
