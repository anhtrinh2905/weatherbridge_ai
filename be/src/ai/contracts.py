from typing import Any, Protocol

from pydantic import BaseModel, Field


class InferenceRequest(BaseModel):
    task: str = Field(min_length=1, max_length=80)
    text: str = Field(min_length=1, max_length=20_000)
    metadata: dict[str, Any] = Field(default_factory=dict)


class InferenceResponse(BaseModel):
    output: dict[str, Any]
    model_name: str
    model_version: str
    confidence: float = Field(ge=0, le=1)
    metadata: dict[str, Any] = Field(default_factory=dict)


class InferenceProvider(Protocol):
    async def infer(self, request: InferenceRequest) -> InferenceResponse: ...
