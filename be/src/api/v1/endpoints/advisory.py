from fastapi import APIRouter, Depends

from ai.advisory.exceptions import (
    AdvisoryConfigError,
    AdvisoryHTTPError,
    AdvisoryTransportError,
)
from ai.advisory.models import (
    AlertDraft,
    AlertDraftRequest,
    ResidentActionPlan,
    ResidentActionRequest,
    WeatherActionPlan,
    WeatherActionRequest,
)
from ai.advisory.openai_service import OpenAIAdvisoryService
from ai.forecast.exceptions import (
    OpenMeteoHTTPError,
    OpenMeteoPayloadError,
    OpenMeteoTransportError,
)
from api.deps import get_advisory_service, get_current_user, get_weather_advisory_service
from auth.keycloak import CurrentUser
from core.errors import AppError
from services.weather_advisory_service import WeatherAdvisoryService

router = APIRouter()


def _translate_errors(exc: Exception) -> AppError:
    if isinstance(exc, AdvisoryConfigError):
        return AppError(503, str(exc), "advisory_unavailable")
    if isinstance(exc, AdvisoryTransportError):
        return AppError(503, str(exc), "advisory_unavailable")
    if isinstance(exc, AdvisoryHTTPError):
        return AppError(502, str(exc), "advisory_bad_gateway")
    raise exc


@router.post("/alert-draft", response_model=AlertDraft)
async def draft_alert(
    payload: AlertDraftRequest,
    service: OpenAIAdvisoryService = Depends(get_advisory_service),
    _user: CurrentUser = Depends(get_current_user),
) -> AlertDraft:
    """Draft the three bulletin fields from a hazard's type/level/tier.

    An authoring aid for officers — the returned text is an editable draft and must be reviewed
    before the alert is published (same human-in-the-loop stance as machine translation).
    """
    try:
        return await service.draft_alert(payload)
    except (AdvisoryConfigError, AdvisoryTransportError, AdvisoryHTTPError) as exc:
        raise _translate_errors(exc) from exc


@router.post("/resident-actions", response_model=ResidentActionPlan)
async def resident_actions(
    payload: ResidentActionRequest,
    service: OpenAIAdvisoryService = Depends(get_advisory_service),
    _user: CurrentUser = Depends(get_current_user),
) -> ResidentActionPlan:
    """Expand a published bulletin into a short, ordered action checklist for a resident."""
    try:
        return await service.suggest_resident_actions(payload)
    except (AdvisoryConfigError, AdvisoryTransportError, AdvisoryHTTPError) as exc:
        raise _translate_errors(exc) from exc


@router.post("/weather-actions", response_model=WeatherActionPlan)
async def weather_actions(
    payload: WeatherActionRequest,
    service: WeatherAdvisoryService = Depends(get_weather_advisory_service),
    _user: CurrentUser = Depends(get_current_user),
) -> WeatherActionPlan:
    """Auto-suggest actions for a resident from the live forecast at their location.

    Fetches the Open-Meteo forecast for the given coordinates and asks the model what the
    resident should do over the next few days — a support tool, not an official warning.
    """
    try:
        return await service.recommend(payload)
    except OpenMeteoTransportError as exc:
        raise AppError(503, exc.reason, "open_meteo_unavailable") from exc
    except (OpenMeteoHTTPError, OpenMeteoPayloadError) as exc:
        raise AppError(502, exc.reason, "open_meteo_bad_gateway") from exc
    except (AdvisoryConfigError, AdvisoryTransportError, AdvisoryHTTPError) as exc:
        raise _translate_errors(exc) from exc
