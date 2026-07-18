from __future__ import annotations

import asyncio
import json
import time
from collections.abc import Awaitable, Callable
from pathlib import Path
from typing import Any

import httpx
import jwt
from core.config import Settings

from ai.translation.exceptions import (
    TranslationConfigError,
    TranslationHTTPError,
    TranslationTransportError,
)
from ai.translation.models import TranslationRequest, TranslationResponse

_SCOPE = "https://www.googleapis.com/auth/cloud-translation"
_TRANSLATE_URL = "https://translation.googleapis.com/language/translate/v2"
_TOKEN_TTL_SECONDS = 3600


class GoogleTranslateService:
    """Real Google Cloud Translation (NMT, Basic v2) adapter using a service-account key.

    Auth uses the JWT Bearer Token flow (RFC 7523) signed with PyJWT instead of the google-auth
    SDK, deliberately: the repo already depends on httpx (HTTP) and PyJWT[crypto] (Keycloak JWT
    verification), so this avoids a second auth/HTTP stack for one provider.
    """

    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None) -> None:
        self.settings = settings
        self._client = client
        self._cached_token: str | None = None
        self._cached_token_expiry = 0.0

    async def translate(self, request: TranslationRequest) -> TranslationResponse:
        token = await self._get_access_token()

        async def _call(client: httpx.AsyncClient) -> httpx.Response:
            return await client.post(
                _TRANSLATE_URL,
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "q": request.texts,
                    "target": request.target_language,
                    "source": request.source_language,
                    "format": "text",
                },
            )

        response = await self._request(_call)

        try:
            payload = response.json()
            translations = [item["translatedText"] for item in payload["data"]["translations"]]
        except (KeyError, ValueError) as exc:
            raise TranslationTransportError(f"Unexpected Google Translate payload: {exc}") from exc

        return TranslationResponse(
            translations=translations,
            target_language=request.target_language,
            source_language=request.source_language,
        )

    async def _get_access_token(self) -> str:
        now = time.time()
        if self._cached_token and now < self._cached_token_expiry - 60:
            return self._cached_token

        if not self.settings.google_translate_credentials_path:
            raise TranslationConfigError(
                "GOOGLE_TRANSLATE_CREDENTIALS_PATH is not set — cannot authenticate to "
                "Google Cloud Translation."
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
        return self._cached_token

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
        client = self._client or httpx.AsyncClient(timeout=30)
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
