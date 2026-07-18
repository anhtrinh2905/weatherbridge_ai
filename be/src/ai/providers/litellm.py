from typing import Any

import httpx

from ai.contracts import InferenceRequest, InferenceResponse
from core.config import Settings


class LiteLLMClient:
    """OpenAI-compatible client for a separately deployed LiteLLM gateway."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def infer(self, request: InferenceRequest) -> InferenceResponse:
        headers = {"Content-Type": "application/json"}
        if self.settings.litellm_api_key:
            headers["Authorization"] = f"Bearer {self.settings.litellm_api_key}"
        payload = {
            "model": self.settings.litellm_model,
            "messages": [
                {
                    "role": "system",
                    "content": "Return concise JSON with a summary and key_points array.",
                },
                {"role": "user", "content": request.text},
            ],
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        }
        async with httpx.AsyncClient(
            base_url=self.settings.litellm_base_url.rstrip("/"), timeout=30
        ) as client:
            response = await client.post("/chat/completions", json=payload, headers=headers)
            response.raise_for_status()
            body: dict[str, Any] = response.json()
        content = body["choices"][0]["message"].get("content") or "{}"
        import json

        output = json.loads(content) if isinstance(content, str) else content
        usage = body.get("usage", {})
        return InferenceResponse(
            output=output if isinstance(output, dict) else {"value": output},
            model_name=str(body.get("model", self.settings.litellm_model)),
            model_version="gateway",
            confidence=0.0,
            metadata={"provider": "litellm", "usage": usage},
        )
