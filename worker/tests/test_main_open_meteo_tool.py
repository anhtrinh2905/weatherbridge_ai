from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

import pytest
from ai.contracts import InferenceResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from job_store import ai_jobs
from main import process_job
from settings import Settings


class MockInferenceService:
    async def infer(self, _request: object) -> InferenceResponse:
        return InferenceResponse(
            output={"ok": True, "provider": "mock"},
            model_name="open-meteo-tools",
            model_version="1",
            confidence=1.0,
            metadata={"provider": "tool-dispatcher"},
        )


@pytest.mark.asyncio
async def test_process_job_runs_open_meteo_tool_task(tmp_path, monkeypatch) -> None:
    db_path = tmp_path / "jobs.sqlite"
    settings = Settings(database_url=f"sqlite+aiosqlite:///{db_path}")

    engine = create_async_engine(settings.database_url, connect_args={"check_same_thread": False})
    async with engine.begin() as connection:
        await connection.run_sync(ai_jobs.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    payload = {
        "text": "ignore",
        "tool_call": {"tool": "forecast", "arguments": {"latitude": 1.0, "longitude": 2.0}},
    }
    job_id = uuid4()
    now = datetime.now(UTC)

    async with session_factory() as session:
        await session.execute(
            ai_jobs.insert().values(
                id=job_id,
                user_id="test-user",
                task="open_meteo_tool",
                status="queued",
                payload=payload,
                result=None,
                error=None,
                created_at=now,
                updated_at=now,
            )
        )
        await session.commit()

    monkeypatch.setattr(
        "main.AiInferenceService",
        lambda *_args, **_kwargs: MockInferenceService(),
    )

    await process_job(job_id, session_factory, settings)

    async with session_factory() as session:
        row = (
            await session.execute(select(ai_jobs).where(ai_jobs.c.id == job_id))
        ).mappings().one()

    assert row["status"] == "succeeded"
    assert row["result"]["output"]["ok"] is True
