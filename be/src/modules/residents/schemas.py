from datetime import datetime, time
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

HazardType = Literal["flash_flood", "landslide", "fog"]
NotificationChannel = Literal["sms", "zalo", "email", "web_push", "webhook"]


class ContactCreateRequest(BaseModel):
    channel: NotificationChannel
    value: str = Field(min_length=3, max_length=500)
    is_primary: bool = False
    verified: bool = False


class ContactUpdateRequest(BaseModel):
    value: str | None = Field(default=None, min_length=3, max_length=500)
    is_primary: bool | None = None
    is_active: bool | None = None


class ContactResponse(BaseModel):
    id: UUID
    channel: str
    masked_value: str
    is_primary: bool
    is_active: bool
    verified_at: datetime | None


class ResidentPointRequest(BaseModel):
    location_type: Literal["home", "farm", "livestock", "watch_point"]
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    label: str | None = Field(default=None, max_length=255)
    precision_m: int | None = Field(default=None, ge=0, le=100_000)


class ResidentLocationResponse(BaseModel):
    id: UUID
    location_type: str
    latitude: float
    longitude: float
    label: str | None
    precision_m: int | None
    is_active: bool


class ResidentCreateRequest(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    village_code: str = Field(min_length=1, max_length=120)
    birth_year: int | None = Field(default=None, ge=1900, le=2200)
    source: Literal["self", "official", "import", "demo"] = "official"
    simulated: bool = True
    contacts: list[ContactCreateRequest] = Field(default_factory=list, max_length=10)
    locations: list[ResidentPointRequest] = Field(default_factory=list, max_length=20)
    livelihood_type: Literal["farmer", "livestock", "forestry", "other"] | None = None
    livelihood_details: dict[str, object] = Field(default_factory=dict)


class ResidentResponse(BaseModel):
    id: UUID
    user_profile_id: UUID | None
    full_name: str
    village_code: str
    birth_year: int | None
    verification_status: str
    simulated: bool
    contact_channels: list[str]
    livelihood_types: list[str]
    created_at: datetime


class ResidentDetailResponse(ResidentResponse):
    contacts: list[ContactResponse]
    locations: list[ResidentLocationResponse]


class SupportNeedRequest(BaseModel):
    need_type: str = Field(min_length=1, max_length=50)
    details: dict[str, object] = Field(default_factory=dict)


class LinkResidentAccountRequest(BaseModel):
    keycloak_subject: str = Field(min_length=1, max_length=255)


class HouseholdCreateRequest(BaseModel):
    code: str = Field(min_length=1, max_length=120)
    village_code: str = Field(min_length=1, max_length=120)
    address: str | None = Field(default=None, max_length=500)
    source: Literal["official", "import", "demo"] = "official"
    simulated: bool = True


class HouseholdResponse(BaseModel):
    id: UUID
    code: str
    village_code: str
    address: str | None
    status: str
    simulated: bool


class HouseholdMemberRequest(BaseModel):
    resident_id: UUID
    relationship: str = Field(min_length=1, max_length=40)
    is_head: bool = False


class SubscriptionCreateRequest(BaseModel):
    resident_location_id: UUID | None = None
    hazard_type: HazardType
    minimum_level: int = Field(default=1, ge=1, le=5)
    channel: NotificationChannel
    quiet_hours_start: time | None = None
    quiet_hours_end: time | None = None

    @model_validator(mode="after")
    def validate_quiet_hours(self) -> "SubscriptionCreateRequest":
        if (self.quiet_hours_start is None) != (self.quiet_hours_end is None):
            raise ValueError("Both quiet hour boundaries are required")
        return self


class SubscriptionResponse(BaseModel):
    id: UUID
    resident_location_id: UUID | None
    hazard_type: str
    minimum_level: int
    channel: str
    quiet_hours_start: time | None
    quiet_hours_end: time | None
    is_active: bool


class SubscriptionUpdateRequest(BaseModel):
    minimum_level: int | None = Field(default=None, ge=1, le=5)
    quiet_hours_start: time | None = None
    quiet_hours_end: time | None = None
    is_active: bool | None = None

    @model_validator(mode="after")
    def validate_quiet_hours(self) -> "SubscriptionUpdateRequest":
        if (self.quiet_hours_start is None) != (self.quiet_hours_end is None):
            raise ValueError("Both quiet hour boundaries are required")
        return self


class ConsentResponse(BaseModel):
    id: UUID
    purpose: str
    policy_version: str
    granted_at: datetime
    withdrawn_at: datetime | None
