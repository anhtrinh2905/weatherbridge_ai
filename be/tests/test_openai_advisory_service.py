from __future__ import annotations

import json

import httpx
import pytest

from ai.advisory.exceptions import (
    AdvisoryConfigError,
    AdvisoryHTTPError,
    AdvisoryTransportError,
)
from ai.advisory.models import (
    PROMPT_VERSION,
    AlertDraftRequest,
    ResidentActionRequest,
)
from ai.advisory.openai_service import OpenAIAdvisoryService
from core.config import Settings


def _chat_response(obj: dict[str, object]) -> httpx.Response:
    return httpx.Response(
        200,
        json={"choices": [{"message": {"content": json.dumps(obj)}}]},
    )


@pytest.mark.asyncio
async def test_draft_alert_builds_context_and_parses_three_fields() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url == "https://api.openai.com/v1/chat/completions"
        assert request.headers["Authorization"] == "Bearer sk-test"
        body = json.loads(request.content)
        assert body["model"] == "gpt-4o-mini"
        assert body["response_format"] == {"type": "json_object"}
        user = body["messages"][1]["content"]
        assert "lũ quét" in user
        assert "di dời ngay" in user
        assert "Bản Pon" in user
        return _chat_response(
            {
                "what_happened": "Mưa lớn gây lũ quét.",
                "danger_description": "Nước dâng nhanh, cuốn trôi nhà cửa.",
                "action_instruction": "Di dời ngay lên điểm cao; mang giấy tờ.",
            }
        )

    settings = Settings(openai_api_key="sk-test", openai_model="gpt-4o-mini")
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        service = OpenAIAdvisoryService(settings, client=client)
        draft = await service.draft_alert(
            AlertDraftRequest(
                hazard_type="flash_flood",
                level=4,
                tier="go_now",
                location_label="Bản Pon",
            )
        )

    assert draft.what_happened == "Mưa lớn gây lũ quét."
    assert draft.action_instruction.startswith("Di dời ngay")
    assert draft.model_name == "gpt-4o-mini"
    assert draft.prompt_version == PROMPT_VERSION


@pytest.mark.asyncio
async def test_suggest_resident_actions_returns_step_list() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        user = json.loads(request.content)["messages"][1]["content"]
        assert "Hướng dẫn gốc" in user
        return _chat_response(
            {
                "summary": "Rời khỏi vùng nguy hiểm ngay.",
                "steps": ["Tắt điện.", "Mang giấy tờ.", "Đi lên điểm cao."],
            }
        )

    settings = Settings(openai_api_key="sk-test")
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        service = OpenAIAdvisoryService(settings, client=client)
        plan = await service.suggest_resident_actions(
            ResidentActionRequest(
                hazard_type="landslide",
                level=5,
                tier="go_now",
                what_happened="Sạt lở đất.",
                danger_description="Đất đá có thể vùi lấp nhà.",
                action_instruction="Di dời ngay.",
            )
        )

    assert plan.summary == "Rời khỏi vùng nguy hiểm ngay."
    assert plan.steps == ["Tắt điện.", "Mang giấy tờ.", "Đi lên điểm cao."]
    assert plan.prompt_version == PROMPT_VERSION


@pytest.mark.asyncio
async def test_draft_alert_raises_config_error_when_api_key_missing() -> None:
    service = OpenAIAdvisoryService(Settings(openai_api_key=None))
    with pytest.raises(AdvisoryConfigError):
        await service.draft_alert(
            AlertDraftRequest(hazard_type="fog", level=2, tier="prepare")
        )


@pytest.mark.asyncio
async def test_draft_alert_raises_http_error_on_error_response() -> None:
    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"error": "invalid api key"})

    settings = Settings(openai_api_key="sk-test")
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        service = OpenAIAdvisoryService(settings, client=client)
        with pytest.raises(AdvisoryHTTPError):
            await service.draft_alert(
                AlertDraftRequest(hazard_type="fog", level=2, tier="prepare")
            )


@pytest.mark.asyncio
async def test_suggest_resident_actions_raises_transport_error_on_empty_steps() -> None:
    def handler(_: httpx.Request) -> httpx.Response:
        return _chat_response({"summary": "x", "steps": []})

    settings = Settings(openai_api_key="sk-test")
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        service = OpenAIAdvisoryService(settings, client=client)
        with pytest.raises(AdvisoryTransportError):
            await service.suggest_resident_actions(
                ResidentActionRequest(
                    level=3,
                    tier="prepare",
                    what_happened="a",
                    danger_description="b",
                    action_instruction="c",
                )
            )
