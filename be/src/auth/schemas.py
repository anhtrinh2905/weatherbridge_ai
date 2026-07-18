from pydantic import BaseModel

from auth.authorization import AppRole


class IdentityConfigResponse(BaseModel):
    url: str
    realm: str
    client_id: str
    issuer: str


class CurrentUserResponse(BaseModel):
    id: str
    email: str | None
    display_name: str
    username: str | None
    email_verified: bool
    roles: list[AppRole]
    effective_role: AppRole
    village_id: str | None
