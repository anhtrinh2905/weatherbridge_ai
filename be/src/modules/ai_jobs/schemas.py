from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from ai.contracts import ToolInvocation


class CreateAiJobRequest(BaseModel):
    task: str = Field(default="analyze", min_length=2, max_length=80)
    text: str = Field(min_length=1, max_length=20_000)
    tool_call: ToolInvocation | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class AiJobResponse(BaseModel):
    id: UUID
    task: str
    status: str
    result: dict | None = None
    error: str | None = None
    created_at: datetime
    updated_at: datetime
