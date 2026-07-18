from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class AlertCreateRequest(BaseModel):
    source: Literal["manual", "evacuation"] = "manual"
    hazard_type: Literal["flash_flood", "landslide", "fog"] | None = None
    level: int = Field(ge=1, le=5)
    tier: Literal["prepare", "go_now"]
    confidence: float = Field(ge=0, le=1)
    what_happened: str = Field(min_length=1, max_length=2000)
    danger_description: str = Field(min_length=1, max_length=2000)
    action_instruction: str = Field(min_length=1, max_length=4000)
    deadline_at: datetime
    expires_at: datetime
    target_area_codes: list[str] = Field(min_length=1, max_length=50)

    @model_validator(mode="after")
    def validate_times(self) -> "AlertCreateRequest":
        if self.expires_at <= self.deadline_at:
            raise ValueError("expires_at must be after deadline_at")
        if self.source == "manual" and self.hazard_type is None:
            raise ValueError("Manual hazard alerts require hazard_type")
        return self


class AlertResponse(BaseModel):
    id: UUID
    source: str
    status: str
    hazard_type: str | None
    level: int
    tier: str
    confidence: float
    what_happened: str
    danger_description: str
    action_instruction: str
    deadline_at: datetime
    expires_at: datetime
    target_area_codes: list[str]
    recipient_count: int
    delivery_count: int
    published_at: datetime | None


class PublishAlertResponse(BaseModel):
    alert: AlertResponse
    recipient_count: int
    delivery_count: int


class AcknowledgeAlertRequest(BaseModel):
    status: Literal["seen", "safe", "need_help"]


class AlertInboxItem(BaseModel):
    alert_id: UUID
    recipient_id: UUID
    hazard_type: str | None
    level: int
    tier: str
    what_happened: str
    danger_description: str
    action_instruction: str
    deadline_instruction: str
    deadline_at: datetime
    content_locale: str = "vi"
    is_locale_fallback: bool = False
    audio_available: bool = False
    audio_asset_url: str | None = None
    acknowledgement_status: str
    acknowledged_at: datetime | None


class DeliverySummaryItem(BaseModel):
    channel: str
    status: str
    count: int
