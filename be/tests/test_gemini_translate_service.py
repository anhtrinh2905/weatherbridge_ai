from __future__ import annotations

import json
from pathlib import Path

import httpx
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from ai.translation.exceptions import TranslationConfigError, TranslationHTTPError
from ai.translation.gemini_service import GeminiTranslateService
from ai.translation.models import TranslationRequest
from core.config import Settings

TOKEN_URI = "https://oauth2.googleapis.com/token"
PROJECT_ID = "vinuni-project"


@pytest.fixture
def service_account_key_path(tmp_path: Path) -> Path:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode()

    key_path = tmp_path / "vertex-key.json"
    key_path.write_text(
        json.dumps(
            {
                "client_email": "test-sa@example.iam.gserviceaccount.com",
                "private_key": pem,
                "token_uri": TOKEN_URI,
                "project_id": PROJECT_ID,
            }
        ),
        encoding="utf-8",
    )
    return key_path


def _gemini_response(translations: list[str]) -> httpx.Response:
    return httpx.Response(
        200,
        json={
            "candidates": [
                {
                    "content": {
                        "parts": [{"text": json.dumps({"translations": translations})}],
                    }
                }
            ]
        },
    )


@pytest.mark.asyncio
async def test_translate_mints_token_then_calls_vertex(service_account_key_path: Path) -> None:
    def transport_handler(request: httpx.Request) -> httpx.Response:
        if str(request.url) == TOKEN_URI:
            return httpx.Response(200, json={"access_token": "fake-token", "expires_in": 3600})
        assert (
            str(request.url)
            == f"https://us-central1-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/"
            "locations/us-central1/publishers/google/models/gemini-2.5-flash:generateContent"
        )
        assert request.headers["Authorization"] == "Bearer fake-token"
        return _gemini_response(["[hmn] Đăng xuất", "[hmn] Hôm nay"])

    settings = Settings(google_translate_credentials_path=str(service_account_key_path))
    async with httpx.AsyncClient(transport=httpx.MockTransport(transport_handler)) as client:
        service = GeminiTranslateService(settings, client=client)
        response = await service.translate(
            TranslationRequest(texts=["Đăng xuất", "Hôm nay"], target_language="hmn")
        )

    assert response.translations == ["[hmn] Đăng xuất", "[hmn] Hôm nay"]
    assert response.model_name == "gemini-2.5-flash"


@pytest.mark.asyncio
async def test_translate_raises_config_error_when_credentials_path_missing() -> None:
    service = GeminiTranslateService(Settings())
    with pytest.raises(TranslationConfigError):
        await service.translate(TranslationRequest(texts=["a"], target_language="hmn"))


@pytest.mark.asyncio
async def test_translate_raises_http_error_on_error_response(
    service_account_key_path: Path,
) -> None:
    def transport_handler(request: httpx.Request) -> httpx.Response:
        if str(request.url) == TOKEN_URI:
            return httpx.Response(200, json={"access_token": "fake-token", "expires_in": 3600})
        return httpx.Response(403, json={"error": "Vertex AI API not enabled"})

    settings = Settings(google_translate_credentials_path=str(service_account_key_path))
    async with httpx.AsyncClient(transport=httpx.MockTransport(transport_handler)) as client:
        service = GeminiTranslateService(settings, client=client)
        with pytest.raises(TranslationHTTPError):
            await service.translate(TranslationRequest(texts=["a"], target_language="hmn"))
