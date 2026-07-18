from __future__ import annotations

import json

import httpx
import pytest

from ai.translation.exceptions import (
    TranslationConfigError,
    TranslationHTTPError,
    TranslationTransportError,
)
from ai.translation.models import TranslationRequest
from ai.translation.openai_service import OpenAITranslateService
from core.config import Settings


def _chat_response(translations: list[str]) -> httpx.Response:
    return httpx.Response(
        200,
        json={
            "choices": [
                {"message": {"content": json.dumps({"translations": translations})}}
            ]
        },
    )


@pytest.mark.asyncio
async def test_translate_sends_numbered_lines_and_parses_json_response() -> None:
    def transport_handler(request: httpx.Request) -> httpx.Response:
        assert request.url == "https://api.openai.com/v1/chat/completions"
        assert request.headers["Authorization"] == "Bearer sk-test"
        body = json.loads(request.content)
        assert body["model"] == "gpt-4o-mini"
        assert body["messages"][1]["content"] == "1. Đăng xuất\n2. Hôm nay"
        return _chat_response(["[hmn] Đăng xuất", "[hmn] Hôm nay"])

    settings = Settings(openai_api_key="sk-test", openai_model="gpt-4o-mini")
    async with httpx.AsyncClient(transport=httpx.MockTransport(transport_handler)) as client:
        service = OpenAITranslateService(settings, client=client)
        response = await service.translate(
            TranslationRequest(texts=["Đăng xuất", "Hôm nay"], target_language="hmn")
        )

    assert response.translations == ["[hmn] Đăng xuất", "[hmn] Hôm nay"]
    assert response.model_name == "gpt-4o-mini"


@pytest.mark.asyncio
async def test_translate_raises_config_error_when_api_key_missing() -> None:
    service = OpenAITranslateService(Settings(openai_api_key=None))
    with pytest.raises(TranslationConfigError):
        await service.translate(TranslationRequest(texts=["a"], target_language="hmn"))


@pytest.mark.asyncio
async def test_translate_raises_http_error_on_error_response() -> None:
    def transport_handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"error": "invalid api key"})

    settings = Settings(openai_api_key="sk-test")
    async with httpx.AsyncClient(transport=httpx.MockTransport(transport_handler)) as client:
        service = OpenAITranslateService(settings, client=client)
        with pytest.raises(TranslationHTTPError):
            await service.translate(TranslationRequest(texts=["a"], target_language="hmn"))


@pytest.mark.asyncio
async def test_translate_raises_transport_error_on_count_mismatch() -> None:
    def transport_handler(_: httpx.Request) -> httpx.Response:
        return _chat_response(["only-one"])

    settings = Settings(openai_api_key="sk-test")
    async with httpx.AsyncClient(transport=httpx.MockTransport(transport_handler)) as client:
        service = OpenAITranslateService(settings, client=client)
        with pytest.raises(TranslationTransportError):
            await service.translate(
                TranslationRequest(texts=["a", "b"], target_language="hmn")
            )
