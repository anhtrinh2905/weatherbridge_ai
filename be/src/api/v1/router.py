from fastapi import APIRouter

from api.v1.endpoints import ai_jobs, auth, health

router = APIRouter()
router.include_router(health.router, prefix="/health", tags=["health"])
router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(ai_jobs.router, prefix="/ai/jobs", tags=["ai-jobs"])
