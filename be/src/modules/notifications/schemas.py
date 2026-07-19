from datetime import datetime
from uuid import UUID

from pydantic import AliasChoices, BaseModel, Field, HttpUrl


class WebPushKeys(BaseModel):
    p256dh: str = Field(min_length=1, max_length=1024)
    auth: str = Field(min_length=1, max_length=1024)


class WebPushSubscriptionRequest(BaseModel):
    endpoint: HttpUrl
    expiration_time: int | None = Field(
        default=None,
        validation_alias=AliasChoices("expirationTime", "expiration_time"),
    )
    keys: WebPushKeys
    device_label: str | None = Field(default=None, max_length=80)


class WebPushConfigResponse(BaseModel):
    public_key: str


class WebPushSubscriptionResponse(BaseModel):
    id: UUID
    is_active: bool
    last_seen_at: datetime


class WebPushSubscriptionStatusResponse(BaseModel):
    id: UUID
    is_active: bool
    last_seen_at: datetime | None = None


class NotificationChannelResponse(BaseModel):
    channel: str
    available: bool
