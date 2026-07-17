from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import AppError
from core.time import utc_now
from database.models import AiJob, JobStatus
from modules.ai_jobs.schemas import AiJobResponse, CreateAiJobRequest
from queues.redis_queue import JobQueue


class AiJobService:
    def __init__(self, session: AsyncSession, queue: JobQueue) -> None:
        self.session = session
        self.queue = queue

    async def create(self, payload: CreateAiJobRequest, user_id: str) -> AiJobResponse:
        now = utc_now()
        job = AiJob(
            user_id=user_id,
            task=payload.task,
            status=JobStatus.QUEUED.value,
            payload={"text": payload.text},
            created_at=now,
            updated_at=now,
        )
        self.session.add(job)
        await self.session.flush()
        await self.session.commit()
        try:
            await self.queue.enqueue(job.id)
        except Exception as exc:
            job.status = JobStatus.FAILED.value
            job.error = "Unable to enqueue job"
            job.updated_at = utc_now()
            await self.session.commit()
            raise AppError(503, "Job queue is unavailable", "queue_unavailable") from exc
        return self.to_response(job)

    async def get(self, job_id: UUID, user_id: str) -> AiJobResponse:
        job = await self.session.scalar(
            select(AiJob).where(AiJob.id == job_id, AiJob.user_id == user_id)
        )
        if not job:
            raise AppError(404, "Job not found", "job_not_found")
        return self.to_response(job)

    @staticmethod
    def to_response(job: AiJob) -> AiJobResponse:
        return AiJobResponse(
            id=job.id,
            task=job.task,
            status=job.status,
            result=job.result,
            error=job.error,
            created_at=job.created_at,
            updated_at=job.updated_at,
        )
