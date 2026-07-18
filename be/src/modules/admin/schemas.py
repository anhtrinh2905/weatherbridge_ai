from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel

# The four domain roles an admin assigns; every user also keeps the base `user`
# realm role. Kept in one place so the "exactly one domain role" rule is explicit.
DomainRole = Literal["admin", "commune_officer", "village_head", "resident"]
DOMAIN_ROLES: frozenset[str] = frozenset(("admin", "commune_officer", "village_head", "resident"))


class AdminAiJobResponse(BaseModel):
    """Job view for admins: like AiJobResponse but exposes owner + payload so an
    operator can see whose job it is and what it was asked to do."""

    id: UUID
    user_id: str
    task: str
    status: str
    payload: dict[str, object] | None = None
    result: dict[str, object] | None = None
    error: str | None = None
    created_at: datetime
    updated_at: datetime


class JobStatsResponse(BaseModel):
    queued: int
    running: int
    succeeded: int
    failed: int
    total: int


class ForecastFreshnessItem(BaseModel):
    location_code: str
    location_name: str
    source: str | None = None
    fetched_at: datetime | None = None


class AdminUserResponse(BaseModel):
    """A Keycloak user as the admin page sees it: identity plus the single domain
    role and optional village scoping."""

    id: str
    username: str | None = None
    email: str | None = None
    display_name: str
    enabled: bool
    domain_role: DomainRole | None = None
    village_id: str | None = None


class SetRoleRequest(BaseModel):
    role: DomainRole


class SetVillageRequest(BaseModel):
    village_id: str | None = None
