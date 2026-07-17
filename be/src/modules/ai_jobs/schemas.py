from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CreateAiJobRequest(BaseModel):
    task: str = Field(default="analyze", min_length=2, max_length=80)
    text: str = Field(min_length=1, max_length=20_000)


class AiJobResponse(BaseModel):
    id: UUID
    task: str
    status: str
    result: dict | None = None
    error: str | None = None
    created_at: datetime
    updated_at: datetime
