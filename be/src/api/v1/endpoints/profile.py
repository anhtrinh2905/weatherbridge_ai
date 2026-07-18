from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user
from auth.keycloak import CurrentUser
from database.session import get_db
from modules.profiles.schemas import ProfileResponse, UpdateProfileRequest
from services.profile_service import ProfileService

router = APIRouter()


@router.get("", response_model=ProfileResponse)
async def get_profile(
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> ProfileResponse:
    return await ProfileService(session).response(user)


@router.patch("", response_model=ProfileResponse)
async def update_profile(
    payload: UpdateProfileRequest,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> ProfileResponse:
    return await ProfileService(session).update_locale(user, payload.preferred_locale)
