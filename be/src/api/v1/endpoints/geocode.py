from fastapi import APIRouter, Depends

from api.deps import get_current_user
from auth.keycloak import CurrentUser
from core.config import Settings, get_settings
from modules.geocode.schemas import ReverseGeocodeRequest, ReverseGeocodeResponse
from modules.geocode.service import GeocodeService

router = APIRouter()


@router.post("/reverse", response_model=ReverseGeocodeResponse)
async def reverse_geocode(
    payload: ReverseGeocodeRequest,
    settings: Settings = Depends(get_settings),
    _user: CurrentUser = Depends(get_current_user),
) -> ReverseGeocodeResponse:
    return await GeocodeService(settings).reverse(payload)
