import pytest

from ai.contracts import InferenceRequest
from core.config import Settings
from services.ai_inference_service import AiInferenceService


@pytest.mark.asyncio
async def test_ai_service_defaults_to_safe_mock_provider() -> None:
    service = AiInferenceService(Settings(litellm_enabled=False, langfuse_enabled=False))
    response = await service.infer(InferenceRequest(task="smoke", text="hello world"))
    assert response.model_name == "mock-provider"
    assert response.output["word_count"] == 2
