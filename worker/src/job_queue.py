import json
from uuid import UUID

from redis.asyncio import Redis

QUEUE_NAME = "vai-code:jobs"


async def next_job(redis: Redis) -> UUID | None:
    item = await redis.blpop(QUEUE_NAME, timeout=5)
    if not item:
        return None
    _, payload = item
    return UUID(json.loads(payload)["job_id"])
