from fastapi import APIRouter, Depends

from api.deps import get_current_user
from auth.keycloak import CurrentUser
from auth.schemas import CurrentUserResponse, IdentityConfigResponse
from core.config import Settings, get_settings

router = APIRouter()


@router.get("/config", response_model=IdentityConfigResponse)
async def identity_config(settings: Settings = Depends(get_settings)) -> IdentityConfigResponse:
    return IdentityConfigResponse(
        url=settings.keycloak_url,
        realm=settings.keycloak_realm,
        client_id=settings.keycloak_client_id,
        issuer=settings.resolved_keycloak_issuer,
    )


@router.get("/me", response_model=CurrentUserResponse)
async def me(user: CurrentUser = Depends(get_current_user)) -> CurrentUserResponse:
    return CurrentUserResponse(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        username=user.username,
        email_verified=user.email_verified,
        roles=sorted(user.roles),
        effective_role=user.effective_role,
        village_id=user.village_id,
    )
