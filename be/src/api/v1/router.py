from fastapi import APIRouter

from api.v1.endpoints import admin, ai_jobs, auth, forecasts, health, open_meteo

router = APIRouter()
router.include_router(health.router, prefix="/health", tags=["health"])
router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(ai_jobs.router, prefix="/ai/jobs", tags=["ai-jobs"])
router.include_router(forecasts.router, prefix="/forecasts", tags=["forecasts"])
router.include_router(open_meteo.router, prefix="/open-meteo", tags=["open-meteo"])
router.include_router(admin.router, prefix="/admin", tags=["admin"])
