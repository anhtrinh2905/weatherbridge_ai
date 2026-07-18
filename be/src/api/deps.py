from collections.abc import AsyncIterator, Awaitable, Callable
from functools import lru_cache

from fastapi import Depends, Request
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from ai.forecast import OpenMeteoService
from ai.translation.gemini_service import GeminiTranslateService
from auth.keycloak import CurrentUser, KeycloakVerifier
from auth.keycloak_admin import KeycloakAdminClient
from core.config import Settings, get_settings
from core.errors import AppError
from database.session import get_db
from queues.redis_queue import JobQueue
from repositories.hazard_archive_repository import HazardArchiveRepository
from services.admin_user_service import AdminUserService
from services.ai_job_service import AiJobService
from services.forecast_service import ForecastService
from services.hazard_archive_service import HazardArchiveService
from services.translation_service import TranslationCacheService


@lru_cache
def get_keycloak_verifier() -> KeycloakVerifier:
    return KeycloakVerifier(get_settings())


def get_open_meteo_service(settings: Settings = Depends(get_settings)) -> OpenMeteoService:
    return OpenMeteoService(settings)


@lru_cache
def get_keycloak_admin_client() -> KeycloakAdminClient:
    # Cached so the service-account access token is reused across requests.
    return KeycloakAdminClient(get_settings())


async def get_current_user(
    request: Request,
    verifier: KeycloakVerifier = Depends(get_keycloak_verifier),
) -> CurrentUser:
    authorization = request.headers.get("Authorization")
    if not authorization or not authorization.lower().startswith("bearer "):
        raise AppError(401, "Authentication is required", "authentication_required")
    return await verifier.verify(authorization[7:])


def require_roles(*roles: str) -> Callable[[CurrentUser], Awaitable[CurrentUser]]:
    """Authorization guard: fail closed unless the caller holds one of `roles`.

    Authentication (`get_current_user`) only proves identity; role checks live
    here so every guarded endpoint returns 403 for the wrong role. The frontend
    `RoleRoute` is UX-only — this is the real boundary.
    """

    async def _require(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.roles.isdisjoint(roles):
            raise AppError(403, "You do not have access to this resource", "forbidden")
        return user

    return _require


require_admin = require_roles("admin")


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


async def get_hazard_archive_service(
    session: AsyncSession = Depends(get_db),
) -> AsyncIterator[HazardArchiveService]:
    yield HazardArchiveService(HazardArchiveRepository(session))


async def get_admin_user_service(
    client: KeycloakAdminClient = Depends(get_keycloak_admin_client),
    session: AsyncSession = Depends(get_db),
) -> AsyncIterator[AdminUserService]:
    yield AdminUserService(client, session)


def get_gemini_translate_service(
    settings: Settings = Depends(get_settings),
) -> GeminiTranslateService:
    return GeminiTranslateService(settings)


async def get_translation_cache_service(
    redis: Redis = Depends(get_redis),
    provider: GeminiTranslateService = Depends(get_gemini_translate_service),
) -> AsyncIterator[TranslationCacheService]:
    yield TranslationCacheService(redis, provider)
