from __future__ import annotations

import pytest

from ai.contracts import InferenceRequest, ToolInvocation
from ai.forecast.models import ForecastRequest
from ai.tools.dispatcher import OpenMeteoToolNotFoundError
from core.config import Settings
from services.ai_inference_service import AiInferenceService


class MockToolService:
    async def forecast(self, request: ForecastRequest) -> dict[str, object]:
        return {
            "latitude": request.latitude,
            "longitude": request.longitude,
        }


@pytest.mark.asyncio
async def test_open_meteo_tool_task_uses_tool_dispatcher() -> None:
    service = AiInferenceService(
        Settings(litellm_enabled=False, langfuse_enabled=False),
        open_meteo_service=MockToolService(),
    )
    response = await service.infer(
        InferenceRequest(
            task="open_meteo_tool",
            text="ignore",
            tool_call=ToolInvocation(
                tool="forecast",
                arguments={"latitude": 10.1, "longitude": 20.2},
            ),
        )
    )

    assert response.model_name == "open-meteo-tools"
    assert response.model_version == "1"
    assert response.confidence == 1.0
    assert response.output["latitude"] == 10.1
    assert response.output["longitude"] == 20.2


@pytest.mark.asyncio
async def test_open_meteo_tool_task_requires_tool_call() -> None:
    service = AiInferenceService(Settings(litellm_enabled=False, langfuse_enabled=False))
    request = InferenceRequest(task="open_meteo_tool", text="ignore")

    with pytest.raises(ValueError, match="tool_call is required"):
        await service.infer(request)


@pytest.mark.asyncio
async def test_open_meteo_tool_task_propagates_unknown_tool_error() -> None:
    service = AiInferenceService(
        Settings(litellm_enabled=False, langfuse_enabled=False),
        open_meteo_service=MockToolService(),
    )

    with pytest.raises(OpenMeteoToolNotFoundError):
        await service.infer(
            InferenceRequest(
                task="open_meteo_tool",
                text="ignore",
                tool_call=ToolInvocation(tool="does_not_exist", arguments={}),
            )
        )
