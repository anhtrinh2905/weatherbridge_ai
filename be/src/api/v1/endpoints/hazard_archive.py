from auth.keycloak import CurrentUser
from fastapi import APIRouter, Depends, Query, status
from modules.ai_jobs.schemas import AiJobResponse
from modules.hazard_archive.schemas import (
    ArchiveCoverageResponse,
    BackfillArchiveRequest,
    DisasterEventResponse,
    GeoLocationResponse,
)
from services.ai_job_service import AiJobService
from services.hazard_archive_service import HazardArchiveService

from api.deps import get_ai_job_service, get_current_user, get_hazard_archive_service, require_admin

router = APIRouter(dependencies=[Depends(require_admin)])


@router.get("/locations", response_model=list[GeoLocationResponse])
async def list_locations(
    sampling_only: bool = Query(default=False),
    unresolved_only: bool = Query(default=False),
    service: HazardArchiveService = Depends(get_hazard_archive_service),
) -> list[GeoLocationResponse]:
    return await service.list_locations(
        sampling_only=sampling_only, unresolved_only=unresolved_only
    )


@router.get("/events", response_model=list[DisasterEventResponse])
async def list_events(
    verification_status: str | None = Query(default=None),
    service: HazardArchiveService = Depends(get_hazard_archive_service),
) -> list[DisasterEventResponse]:
    return await service.list_events(verification_status)


@router.get("/coverage", response_model=list[ArchiveCoverageResponse])
async def coverage(
    service: HazardArchiveService = Depends(get_hazard_archive_service),
) -> list[ArchiveCoverageResponse]:
    return await service.coverage()


@router.post("/backfills", response_model=AiJobResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_backfill(
    payload: BackfillArchiveRequest,
    jobs: AiJobService = Depends(get_ai_job_service),
    user: CurrentUser = Depends(get_current_user),
) -> AiJobResponse:
    return await jobs.create_system(
        task="historical_weather_backfill",
        payload=payload.model_dump(mode="json"),
        user_id=user.id,
    )


@router.post("/exports", response_model=AiJobResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_training_export(
    jobs: AiJobService = Depends(get_ai_job_service),
    user: CurrentUser = Depends(get_current_user),
) -> AiJobResponse:
    return await jobs.create_system(
        task="training_csv_export",
        payload={"format": "csv", "dataset": "hazard_training"},
        user_id=user.id,
    )
