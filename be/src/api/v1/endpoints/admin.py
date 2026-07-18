from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from api.deps import (
    get_admin_user_service,
    get_ai_job_service,
    get_forecast_service,
    require_admin,
)
from modules.admin.schemas import (
    AdminAiJobResponse,
    AdminUserResponse,
    ForecastFreshnessItem,
    JobStatsResponse,
    SetRoleRequest,
    SetVillageRequest,
)
from services.admin_user_service import AdminUserService
from services.ai_job_service import AiJobService
from services.forecast_service import ForecastService

router = APIRouter(dependencies=[Depends(require_admin)])


@router.get("/jobs", response_model=list[AdminAiJobResponse])
async def list_jobs(
    status: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    service: AiJobService = Depends(get_ai_job_service),
) -> list[AdminAiJobResponse]:
    return await service.list_all(status=status, limit=limit, offset=offset)


@router.get("/jobs/stats", response_model=JobStatsResponse)
async def job_stats(
    service: AiJobService = Depends(get_ai_job_service),
) -> JobStatsResponse:
    return await service.stats()


@router.post("/jobs/{job_id}/retry", response_model=AdminAiJobResponse)
async def retry_job(
    job_id: UUID,
    service: AiJobService = Depends(get_ai_job_service),
) -> AdminAiJobResponse:
    return await service.retry(job_id)


@router.get("/forecasts", response_model=list[ForecastFreshnessItem])
async def forecast_freshness(
    service: ForecastService = Depends(get_forecast_service),
) -> list[ForecastFreshnessItem]:
    return await service.list_freshness()


@router.get("/users", response_model=list[AdminUserResponse])
async def list_users(
    service: AdminUserService = Depends(get_admin_user_service),
) -> list[AdminUserResponse]:
    return await service.list_users()


@router.put("/users/{user_id}/role", status_code=status.HTTP_204_NO_CONTENT)
async def set_user_role(
    user_id: str,
    payload: SetRoleRequest,
    service: AdminUserService = Depends(get_admin_user_service),
) -> None:
    await service.set_domain_role(user_id, payload.role)


@router.put("/users/{user_id}/village", status_code=status.HTTP_204_NO_CONTENT)
async def set_user_village(
    user_id: str,
    payload: SetVillageRequest,
    service: AdminUserService = Depends(get_admin_user_service),
) -> None:
    await service.set_village(user_id, payload.village_id)
