from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class LocaleResponse(BaseModel):
    code: str
    display_name: str
    native_name: str | None
    status: str
    is_active: bool
    tts_enabled: bool
    fallback_locale_code: str | None


class AlertTranslationDraftRequest(BaseModel):
    locale: str = Field(min_length=2, max_length=35)
    what_happened: str = Field(min_length=1, max_length=2000)
    danger_description: str = Field(min_length=1, max_length=2000)
    action_instruction: str = Field(min_length=1, max_length=4000)
    deadline_instruction: str = Field(min_length=1, max_length=2000)
    translation_method: Literal["manual", "machine"] = "manual"


class AlertTranslationReviewRequest(BaseModel):
    decision: Literal["approve", "reject"]
    review_note: str | None = Field(default=None, max_length=2000)


class AlertTranslationResponse(BaseModel):
    id: UUID
    alert_id: UUID
    locale: str
    what_happened: str
    danger_description: str
    action_instruction: str
    deadline_instruction: str
    translation_status: str
    translation_method: str
    version: int
    reviewed_at: datetime | None
    review_note: str | None
    created_at: datetime


class AlertLocalizedContentResponse(BaseModel):
    id: UUID
    alert_id: UUID
    locale: str
    what_happened: str
    danger_description: str
    action_instruction: str
    deadline_instruction: str
    is_published: bool
