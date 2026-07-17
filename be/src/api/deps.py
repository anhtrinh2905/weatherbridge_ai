from collections.abc import AsyncIterator
from functools import lru_cache

from fastapi import Depends, Request
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from auth.keycloak import CurrentUser, KeycloakVerifier
from core.config import Settings, get_settings
from core.errors import AppError
from database.session import get_db
from queues.redis_queue import JobQueue
from services.ai_job_service import AiJobService


@lru_cache
def get_keycloak_verifier() -> KeycloakVerifier:
    return KeycloakVerifier(get_settings())


async def get_current_user(
    request: Request, verifier: KeycloakVerifier = Depends(get_keycloak_verifier)
) -> CurrentUser:
    authorization = request.headers.get("Authorization")
    if not authorization or not authorization.lower().startswith("bearer "):
        raise AppError(401, "Authentication is required", "authentication_required")
    return await verifier.verify(authorization[7:])


async def get_redis(settings: Settings = Depends(get_settings)) -> AsyncIterator[Redis]:
    redis = Redis.from_url(settings.redis_url, decode_responses=True)
    try:
        yield redis
    finally:
        await redis.aclose()


async def get_job_queue(redis: Redis = Depends(get_redis)) -> AsyncIterator[JobQueue]:
    yield JobQueue(redis)


async def get_ai_job_service(
    session: AsyncSession = Depends(get_db),
    queue: JobQueue = Depends(get_job_queue),
) -> AsyncIterator[AiJobService]:
    yield AiJobService(session, queue)
