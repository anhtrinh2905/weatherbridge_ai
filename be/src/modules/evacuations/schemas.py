from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class ShelterCreateRequest(BaseModel):
    code: str = Field(min_length=1, max_length=120)
    area_code: str = Field(min_length=1, max_length=120)
    name: str = Field(min_length=1, max_length=255)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    capacity: int | None = Field(default=None, ge=0)
    accessibility: dict[str, object] = Field(default_factory=dict)
    simulated: bool = True


class ShelterResponse(BaseModel):
    id: UUID
    code: str
    area_code: str
    name: str
    capacity: int | None
    accessibility: dict[str, object]
    status: str
    simulated: bool


class EvacuationOrderCreateRequest(BaseModel):
    alert_id: UUID
    area_code: str = Field(min_length=1, max_length=120)
    starts_at: datetime
    ends_at: datetime | None = None
    instructions: str = Field(min_length=1, max_length=4000)


class EvacuationOrderResponse(BaseModel):
    id: UUID
    alert_id: UUID
    area_code: str
    status: str
    starts_at: datetime
    ends_at: datetime | None
    instructions: str
    assignment_count: int


class EvacuationAssignmentRequest(BaseModel):
    shelter_id: UUID
    household_id: UUID | None = None
    resident_id: UUID | None = None


class EvacuationAssignmentResponse(BaseModel):
    id: UUID
    evacuation_order_id: UUID
    shelter_id: UUID
    household_id: UUID | None
    resident_id: UUID | None
    status: str


class SafetyEventCreateRequest(BaseModel):
    resident_id: UUID | None = None
    evacuation_order_id: UUID | None = None
    status: Literal["unknown", "safe", "need_help", "visited", "at_shelter"]
    notes: str | None = Field(default=None, max_length=1000)


class SafetyEventResponse(BaseModel):
    id: UUID
    resident_id: UUID
    evacuation_order_id: UUID | None
    status: str
    occurred_at: datetime
