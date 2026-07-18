from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user
from auth.keycloak import CurrentUser
from database.session import get_db
from modules.localization.schemas import LocaleResponse
from services.localization_service import LocalizationService

router = APIRouter()


@router.get("", response_model=list[LocaleResponse])
async def list_locales(
    include_inactive: bool = Query(default=False),
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> list[LocaleResponse]:
    return await LocalizationService(session).list_locales(include_inactive, user)
