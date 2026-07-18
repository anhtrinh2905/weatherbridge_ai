import asyncio
import logging
from datetime import date

from ai.contracts import InferenceRequest
from core.config import Settings as BackendSettings
from redis.asyncio import Redis
from services.ai_inference_service import AiInferenceService
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from archive_operations import TRAINING_CSV_EXPORT_TASK, export_training_csv
from forecast_ingest import FORECAST_INGEST_TASK, ingest_forecast
from job_queue import next_job
from job_store import ai_jobs, set_status
from notification_dispatch import process_outbox_batch
from open_meteo_backfill import HISTORICAL_WEATHER_BACKFILL_TASK, backfill_open_meteo
from settings import Settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


async def process_job(
    job_id, session_factory: async_sessionmaker[AsyncSession], settings: Settings
) -> None:
    async with session_factory() as session:
        row = (
            (await session.execute(select(ai_jobs).where(ai_jobs.c.id == job_id)))
            .mappings()
            .first()
        )
        if not row:
            logging.warning("job_not_found job_id=%s", job_id)
            return
        await set_status(session, job_id, "running")
        try:
            if row["task"] == FORECAST_INGEST_TASK:
                # a failure here keeps the previous snapshot — the map never blanks
                result = await ingest_forecast(
                    session,
                    row["payload"],
                    settings,
                )
                await set_status(session, job_id, "succeeded", result=result)
            elif row["task"] == HISTORICAL_WEATHER_BACKFILL_TASK:
                payload = row["payload"]
                result = await backfill_open_meteo(
                    session,
                    settings,
                    start_date=date.fromisoformat(payload["start_date"]),
                    end_date=date.fromisoformat(payload["end_date"]),
                    products=payload.get(
                        "products", ["historical_forecast", "previous_runs", "archive"]
                    ),
                    location_codes=payload.get("location_codes"),
                    forecast_model=payload.get("forecast_model", "gfs_seamless"),
                    archive_model=payload.get("archive_model", "best_match"),
                    continue_on_error=payload.get("continue_on_error", False),
                )
                await set_status(session, job_id, "succeeded", result=result)
            elif row["task"] == TRAINING_CSV_EXPORT_TASK:
                result = await export_training_csv(session)
                await set_status(session, job_id, "succeeded", result=result)
            else:
                request = InferenceRequest(task=row["task"], text=row["payload"]["text"])
                inference = await AiInferenceService(BackendSettings()).infer(request)
                await set_status(session, job_id, "succeeded", result=inference.model_dump())
        except Exception as exc:
            logging.exception("job_failed job_id=%s", job_id)
            await set_status(session, job_id, "failed", error=str(exc))


async def run() -> None:
    settings = Settings()
    engine = create_async_engine(settings.database_url, pool_pre_ping=True)
    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    redis: Redis = Redis.from_url(settings.redis_url, decode_responses=True)
    logging.info("worker_started")
    try:
        while True:
            job_id = await next_job(redis)
            if job_id:
                await process_job(job_id, session_factory, settings)
            else:
                async with session_factory() as session:
                    await process_outbox_batch(session, settings)
    finally:
        await redis.aclose()
        await engine.dispose()


if __name__ == "__main__":
    try:
        asyncio.run(run())
    except KeyboardInterrupt:
        pass
