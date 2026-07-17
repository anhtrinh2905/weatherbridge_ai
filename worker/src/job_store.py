from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import JSON, Column, DateTime, MetaData, String, Table, Text, Uuid, update
from sqlalchemy.ext.asyncio import AsyncSession

metadata = MetaData()
ai_jobs = Table(
    "ai_jobs",
    metadata,
    # These columns mirror the API migration. The worker deliberately does not
    # import API ORM models, keeping deploy units independent.
    Column("id", Uuid(as_uuid=True), primary_key=True),
    Column("user_id", String(255), nullable=False),
    Column("task", String(80), nullable=False),
    Column("status", String(20), nullable=False),
    Column("payload", JSON, nullable=False),
    Column("result", JSON),
    Column("error", Text),
    Column("created_at", DateTime(timezone=True), nullable=False),
    Column("updated_at", DateTime(timezone=True), nullable=False),
)


async def set_status(
    session: AsyncSession,
    job_id: UUID,
    status: str,
    result: dict | None = None,
    error: str | None = None,
) -> None:
    await session.execute(
        update(ai_jobs)
        .where(ai_jobs.c.id == job_id)
        .values(status=status, result=result, error=error, updated_at=datetime.now(UTC))
    )
    await session.commit()
