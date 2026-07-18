from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import AppError
from core.time import utc_now
from database.models import AiJob, JobStatus
from modules.admin.schemas import AdminAiJobResponse, JobStatsResponse
from modules.ai_jobs.schemas import AiJobResponse, CreateAiJobRequest
from queues.redis_queue import JobQueue


class AiJobService:
    def __init__(self, session: AsyncSession, queue: JobQueue) -> None:
        self.session = session
        self.queue = queue

    async def create(self, payload: CreateAiJobRequest, user_id: str) -> AiJobResponse:
        return await self.create_system(payload.task, {"text": payload.text}, user_id)

    async def create_system(
        self, task: str, payload: dict[str, object], user_id: str
    ) -> AiJobResponse:
        now = utc_now()
        job = AiJob(
            user_id=user_id,
            task=task,
            status=JobStatus.QUEUED.value,
            payload=payload,
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

    async def list_all(
        self, status: str | None = None, limit: int = 50, offset: int = 0
    ) -> list[AdminAiJobResponse]:
        """Admin-only: every user's jobs, newest first. Unlike `get`, no user scope."""
        query = select(AiJob).order_by(AiJob.created_at.desc()).limit(limit).offset(offset)
        if status is not None:
            query = query.where(AiJob.status == status)
        jobs = (await self.session.scalars(query)).all()
        return [self.to_admin_response(job) for job in jobs]

    async def stats(self) -> JobStatsResponse:
        """Admin-only: job counts per status for the operations overview."""
        rows = await self.session.execute(select(AiJob.status, func.count()).group_by(AiJob.status))
        counts = {status: count for status, count in rows.all()}
        return JobStatsResponse(
            queued=counts.get(JobStatus.QUEUED.value, 0),
            running=counts.get(JobStatus.RUNNING.value, 0),
            succeeded=counts.get(JobStatus.SUCCEEDED.value, 0),
            failed=counts.get(JobStatus.FAILED.value, 0),
            total=sum(counts.values()),
        )

    async def retry(self, job_id: UUID) -> AdminAiJobResponse:
        """Admin-only: re-enqueue a failed job. No-op guarded to failed jobs only."""
        job = await self.session.scalar(select(AiJob).where(AiJob.id == job_id))
        if not job:
            raise AppError(404, "Job not found", "job_not_found")
        if job.status != JobStatus.FAILED.value:
            raise AppError(409, "Only failed jobs can be retried", "job_not_retryable")
        job.status = JobStatus.QUEUED.value
        job.error = None
        job.updated_at = utc_now()
        await self.session.commit()
        try:
            await self.queue.enqueue(job.id)
        except Exception as exc:
            job.status = JobStatus.FAILED.value
            job.error = "Unable to enqueue job"
            job.updated_at = utc_now()
            await self.session.commit()
            raise AppError(503, "Job queue is unavailable", "queue_unavailable") from exc
        return self.to_admin_response(job)

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

    @staticmethod
    def to_admin_response(job: AiJob) -> AdminAiJobResponse:
        return AdminAiJobResponse(
            id=job.id,
            user_id=job.user_id,
            task=job.task,
            status=job.status,
            payload=job.payload,
            result=job.result,
            error=job.error,
            created_at=job.created_at,
            updated_at=job.updated_at,
        )
