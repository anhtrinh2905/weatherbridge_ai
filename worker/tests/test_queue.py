import json
from uuid import uuid4

import pytest

from job_queue import next_job


class FakeRedis:
    async def blpop(self, _key: str, **kwargs: int) -> tuple[str, str]:
        return "vai-code:jobs", json.dumps({"job_id": str(uuid4())})


@pytest.mark.asyncio
async def test_next_job_decodes_job_id() -> None:
    value = await next_job(FakeRedis())
    assert value is not None
