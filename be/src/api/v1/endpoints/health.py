from fastapi import APIRouter, Depends, HTTPException, status
from redis.asyncio import Redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_redis
from database.session import get_db

router = APIRouter()


@router.get("/live")
async def liveness() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/ready")
async def readiness(
    session: AsyncSession = Depends(get_db), redis: Redis = Depends(get_redis)
) -> dict[str, str]:
    try:
        await session.execute(text("SELECT 1"))
        await redis.ping()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Dependencies are not ready"
        ) from exc
    return {"status": "ready"}
