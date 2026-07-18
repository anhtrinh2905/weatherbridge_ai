from fastapi import APIRouter

from api.v1.endpoints import (
    admin,
    ai_jobs,
    alerts,
    auth,
    evacuations,
    forecasts,
    hazard_archive,
    hazards,
    health,
    households,
    locales,
    notifications,
    open_meteo,
    profile,
    residents,
    speech,
    subscriptions,
    translations,
)

router = APIRouter()
router.include_router(health.router, prefix="/health", tags=["health"])
router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(profile.router, prefix="/profile", tags=["profile"])
router.include_router(residents.router, prefix="/residents", tags=["residents"])
router.include_router(households.router, prefix="/households", tags=["households"])
router.include_router(subscriptions.router, prefix="/subscriptions", tags=["subscriptions"])
router.include_router(locales.router, prefix="/locales", tags=["locales"])
router.include_router(hazards.router, prefix="/hazards", tags=["hazards"])
router.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
router.include_router(evacuations.router, prefix="/evacuations", tags=["evacuations"])
router.include_router(ai_jobs.router, prefix="/ai/jobs", tags=["ai-jobs"])
router.include_router(forecasts.router, prefix="/forecasts", tags=["forecasts"])
router.include_router(open_meteo.router, prefix="/open-meteo", tags=["open-meteo"])
router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
router.include_router(translations.router, prefix="/translations", tags=["translations"])
router.include_router(speech.router, prefix="/speech", tags=["speech"])
router.include_router(admin.router, prefix="/admin", tags=["admin"])
router.include_router(
    hazard_archive.router, prefix="/admin/hazard-archive", tags=["admin-hazard-archive"]
)
