import json
from collections.abc import Awaitable
from typing import cast
from uuid import UUID

from redis.asyncio import Redis

QUEUE_NAME = "vai-code:jobs"


class JobQueue:
    def __init__(self, redis: Redis) -> None:
        self.redis = redis

    async def enqueue(self, job_id: UUID) -> None:
        result = self.redis.rpush(QUEUE_NAME, json.dumps({"job_id": str(job_id)}))
        await cast(Awaitable[int], result)

    async def close(self) -> None:
        await self.redis.aclose()
