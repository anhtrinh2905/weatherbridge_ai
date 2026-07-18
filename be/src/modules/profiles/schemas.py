from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ProfileResponse(BaseModel):
    id: UUID
    keycloak_subject: str
    display_name: str
    preferred_locale: str
    status: str
    domain_role: str | None
    area_codes: list[str]
    synced_at: datetime


class UpdateProfileRequest(BaseModel):
    preferred_locale: str = Field(min_length=2, max_length=35)
