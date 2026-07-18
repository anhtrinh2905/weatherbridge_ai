from collections.abc import AsyncIterator, Callable
from functools import lru_cache

from fastapi import Depends, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from ai.forecast import OpenMeteoService
from auth.authorization import AppRole, authorize_role, authorize_village_scope
from auth.keycloak import CurrentUser, KeycloakVerifier
from core.config import Settings, get_settings
from core.errors import AppError
from database.session import get_db
from queues.redis_queue import JobQueue
from services.ai_job_service import AiJobService
from services.forecast_service import ForecastService


@lru_cache
def get_keycloak_verifier() -> KeycloakVerifier:
    return KeycloakVerifier(get_settings())


def get_open_meteo_service(settings: Settings = Depends(get_settings)) -> OpenMeteoService:
    return OpenMeteoService(settings)


bearer_scheme = HTTPBearer(
    auto_error=False,
    scheme_name="KeycloakBearer",
    description="Keycloak access token using the Bearer scheme",
)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Security(bearer_scheme),
    verifier: KeycloakVerifier = Depends(get_keycloak_verifier),
) -> CurrentUser:
    if credentials is None or credentials.scheme.lower() != "bearer" or not credentials.credentials:
        raise AppError(401, "Authentication is required", "authentication_required")
    return await verifier.verify(credentials.credentials)


def require_roles(*allowed_roles: AppRole) -> Callable[[CurrentUser], CurrentUser]:
    allowed = frozenset(allowed_roles)

    def dependency(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        authorize_role(user.effective_role, allowed)
        return user

    return dependency


def get_village_scoped_user(
    village_id: str,
    user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    authorize_village_scope(user.effective_role, user.village_id, village_id)
    return user


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


async def get_forecast_service(
    session: AsyncSession = Depends(get_db),
    queue: JobQueue = Depends(get_job_queue),
) -> AsyncIterator[ForecastService]:
    yield ForecastService(session, queue)
