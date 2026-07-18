from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import AppError
from core.time import utc_now
from database.models import AiJob, ForecastSnapshot, JobStatus
from modules.admin.schemas import ForecastFreshnessItem
from modules.forecasts.locations import LOCATIONS, ForecastLocation
from modules.forecasts.schemas import (
    ForecastDay,
    ForecastRefreshResponse,
    ForecastSnapshotResponse,
)
from queues.redis_queue import JobQueue

FORECAST_INGEST_TASK = "forecast_ingest"


class ForecastService:
    def __init__(self, session: AsyncSession, queue: JobQueue) -> None:
        self.session = session
        self.queue = queue

    @staticmethod
    def resolve_location(location_code: str) -> ForecastLocation:
        location = LOCATIONS.get(location_code)
        if location is None:
            raise AppError(404, "Unknown forecast location", "location_not_found")
        return location

    async def latest(self, location_code: str) -> ForecastSnapshotResponse:
        self.resolve_location(location_code)
        snapshot = await self.session.scalar(
            select(ForecastSnapshot)
            .where(ForecastSnapshot.location_code == location_code)
            .order_by(ForecastSnapshot.fetched_at.desc())
            .limit(1)
        )
        if snapshot is None:
            raise AppError(404, "No forecast has been ingested yet", "forecast_not_found")
        return ForecastSnapshotResponse(
            id=snapshot.id,
            location_code=snapshot.location_code,
            latitude=snapshot.latitude,
            longitude=snapshot.longitude,
            source=snapshot.source,
            days=[ForecastDay.model_validate(day) for day in snapshot.days],
            fetched_at=snapshot.fetched_at,
        )

    async def list_freshness(self) -> list[ForecastFreshnessItem]:
        """Admin-only: latest snapshot timestamp per known location (or None if
        nothing ingested yet), so operators can spot a stale ingest per location."""
        items: list[ForecastFreshnessItem] = []
        for location in LOCATIONS.values():
            snapshot = await self.session.scalar(
                select(ForecastSnapshot)
                .where(ForecastSnapshot.location_code == location.code)
                .order_by(ForecastSnapshot.fetched_at.desc())
                .limit(1)
            )
            items.append(
                ForecastFreshnessItem(
                    location_code=location.code,
                    location_name=location.name,
                    source=snapshot.source if snapshot else None,
                    fetched_at=snapshot.fetched_at if snapshot else None,
                )
            )
        return items

    async def refresh(self, location_code: str, user_id: str) -> ForecastRefreshResponse:
        """Queue a forecast ingest: `be` creates the job, Redis carries the id,
        the worker fetches Open-Meteo and persists the snapshot (AR6)."""
        self.resolve_location(location_code)
        now = utc_now()
        job = AiJob(
            user_id=user_id,
            task=FORECAST_INGEST_TASK,
            status=JobStatus.QUEUED.value,
            payload={"location_code": location_code},
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
        return ForecastRefreshResponse(job_id=job.id, status=job.status)
