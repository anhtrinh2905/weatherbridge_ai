from __future__ import annotations

import json
from pathlib import Path

import httpx
import pytest
from ai.translation.exceptions import TranslationConfigError, TranslationHTTPError
from ai.translation.models import TranslationRequest
from ai.translation.service import GoogleTranslateService
from core.config import Settings
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

TOKEN_URI = "https://oauth2.googleapis.com/token"


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
            }
        ),
        encoding="utf-8",
    )
    return key_path


@pytest.mark.asyncio
async def test_translate_mints_token_then_translates(service_account_key_path: Path) -> None:
    calls: list[str] = []

    def transport_handler(request: httpx.Request) -> httpx.Response:
        calls.append(str(request.url))
        if str(request.url) == TOKEN_URI:
            return httpx.Response(200, json={"access_token": "fake-token", "expires_in": 3600})
        assert str(request.url) == "https://translation.googleapis.com/language/translate/v2"
        assert request.headers["Authorization"] == "Bearer fake-token"
        body = json.loads(request.content)
        assert body["target"] == "hmn"
        assert body["source"] == "vi"
        return httpx.Response(
            200,
            json={
                "data": {
                    "translations": [{"translatedText": f"[hmn] {text}"} for text in body["q"]]
                }
            },
        )

    settings = Settings(google_translate_credentials_path=str(service_account_key_path))
    async with httpx.AsyncClient(transport=httpx.MockTransport(transport_handler)) as client:
        service = GoogleTranslateService(settings, client=client)
        response = await service.translate(
            TranslationRequest(texts=["Đăng xuất", "Hôm nay"], target_language="hmn")
        )

    assert response.translations == ["[hmn] Đăng xuất", "[hmn] Hôm nay"]
    assert calls == [TOKEN_URI, "https://translation.googleapis.com/language/translate/v2"]


@pytest.mark.asyncio
async def test_translate_reuses_cached_token(service_account_key_path: Path) -> None:
    token_calls = 0

    def transport_handler(request: httpx.Request) -> httpx.Response:
        nonlocal token_calls
        if str(request.url) == TOKEN_URI:
            token_calls += 1
            return httpx.Response(200, json={"access_token": "fake-token", "expires_in": 3600})
        body = json.loads(request.content)
        return httpx.Response(
            200,
            json={
                "data": {
                    "translations": [{"translatedText": text} for text in body["q"]]
                }
            },
        )

    settings = Settings(google_translate_credentials_path=str(service_account_key_path))
    async with httpx.AsyncClient(transport=httpx.MockTransport(transport_handler)) as client:
        service = GoogleTranslateService(settings, client=client)
        await service.translate(TranslationRequest(texts=["a"], target_language="hmn"))
        await service.translate(TranslationRequest(texts=["b"], target_language="hmn"))

    assert token_calls == 1


@pytest.mark.asyncio
async def test_translate_raises_config_error_when_credentials_path_missing() -> None:
    service = GoogleTranslateService(Settings())
    with pytest.raises(TranslationConfigError):
        await service.translate(TranslationRequest(texts=["a"], target_language="hmn"))


@pytest.mark.asyncio
async def test_translate_raises_config_error_when_key_file_not_found(tmp_path: Path) -> None:
    settings = Settings(google_translate_credentials_path=str(tmp_path / "missing.json"))
    service = GoogleTranslateService(settings)
    with pytest.raises(TranslationConfigError):
        await service.translate(TranslationRequest(texts=["a"], target_language="hmn"))


@pytest.mark.asyncio
async def test_translate_raises_http_error_on_error_response(
    service_account_key_path: Path,
) -> None:
    def transport_handler(request: httpx.Request) -> httpx.Response:
        if str(request.url) == TOKEN_URI:
            return httpx.Response(200, json={"access_token": "fake-token", "expires_in": 3600})
        return httpx.Response(403, json={"error": "Cloud Translation API not enabled"})

    settings = Settings(google_translate_credentials_path=str(service_account_key_path))
    async with httpx.AsyncClient(transport=httpx.MockTransport(transport_handler)) as client:
        service = GoogleTranslateService(settings, client=client)
        with pytest.raises(TranslationHTTPError):
            await service.translate(TranslationRequest(texts=["a"], target_language="hmn"))
