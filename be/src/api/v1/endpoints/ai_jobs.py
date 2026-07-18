from uuid import UUID

from auth.keycloak import CurrentUser
from fastapi import APIRouter, Depends, status
from modules.ai_jobs.schemas import AiJobResponse, CreateAiJobRequest
from services.ai_job_service import AiJobService

from api.deps import get_ai_job_service, get_current_user

router = APIRouter()


@router.post("", response_model=AiJobResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_job(
    payload: CreateAiJobRequest,
    service: AiJobService = Depends(get_ai_job_service),
    user: CurrentUser = Depends(get_current_user),
) -> AiJobResponse:
    return await service.create(payload, user.id)


@router.get("/{job_id}", response_model=AiJobResponse)
async def get_job(
    job_id: UUID,
    service: AiJobService = Depends(get_ai_job_service),
    user: CurrentUser = Depends(get_current_user),
) -> AiJobResponse:
    return await service.get(job_id, user.id)
