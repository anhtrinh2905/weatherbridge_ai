from datetime import UTC, datetime
from uuid import uuid4

from httpx import AsyncClient

from database.models import AiJob, ForecastSnapshot, JobStatus


def _job(user_id: str, status: JobStatus, task: str = "analyze") -> AiJob:
    now = datetime(2026, 7, 18, tzinfo=UTC)
    return AiJob(
        id=uuid4(),
        user_id=user_id,
        task=task,
        status=status.value,
        payload={"text": "hi"},
        created_at=now,
        updated_at=now,
    )


async def test_admin_endpoints_forbidden_for_non_admin(client: AsyncClient) -> None:
    response = await client.get("/api/v1/admin/jobs")
    assert response.status_code == 403
    assert response.json()["code"] == "forbidden"


async def test_admin_lists_jobs_across_users(admin_client: AsyncClient, db_session) -> None:
    db_session.add(_job("alice", JobStatus.SUCCEEDED))
    db_session.add(_job("bob", JobStatus.FAILED))
    await db_session.commit()

    response = await admin_client.get("/api/v1/admin/jobs")
    assert response.status_code == 200
    owners = {job["user_id"] for job in response.json()}
    assert owners == {"alice", "bob"}


async def test_admin_filters_jobs_by_status(admin_client: AsyncClient, db_session) -> None:
    db_session.add(_job("alice", JobStatus.SUCCEEDED))
    db_session.add(_job("bob", JobStatus.FAILED))
    await db_session.commit()

    response = await admin_client.get("/api/v1/admin/jobs", params={"status": "failed"})
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["status"] == "failed"


async def test_admin_job_stats_counts_by_status(admin_client: AsyncClient, db_session) -> None:
    for status in (JobStatus.QUEUED, JobStatus.FAILED, JobStatus.FAILED, JobStatus.SUCCEEDED):
        db_session.add(_job("alice", status))
    await db_session.commit()

    response = await admin_client.get("/api/v1/admin/jobs/stats")
    assert response.status_code == 200
    body = response.json()
    assert body == {"queued": 1, "running": 0, "succeeded": 1, "failed": 2, "total": 4}


async def test_retry_requeues_failed_job(admin_client: AsyncClient, db_session) -> None:
    job = _job("alice", JobStatus.FAILED)
    job.error = "boom"
    db_session.add(job)
    await db_session.commit()

    response = await admin_client.post(f"/api/v1/admin/jobs/{job.id}/retry")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "queued"
    assert body["error"] is None


async def test_retry_rejects_non_failed_job(admin_client: AsyncClient, db_session) -> None:
    job = _job("alice", JobStatus.SUCCEEDED)
    db_session.add(job)
    await db_session.commit()

    response = await admin_client.post(f"/api/v1/admin/jobs/{job.id}/retry")
    assert response.status_code == 409
    assert response.json()["code"] == "job_not_retryable"


async def test_forecast_freshness_lists_known_locations(
    admin_client: AsyncClient, db_session
) -> None:
    db_session.add(
        ForecastSnapshot(
            location_code="muong-pon",
            latitude=21.59,
            longitude=103.03,
            source="open-meteo:best_match",
            days=[{"date": "2026-07-18", "rainfall_mm": 10.0, "peak_intensity_mm_h": 2.0}],
            fetched_at=datetime(2026, 7, 18, tzinfo=UTC),
        )
    )
    await db_session.commit()

    response = await admin_client.get("/api/v1/admin/forecasts")
    assert response.status_code == 200
    body = response.json()
    muong_pon = next(item for item in body if item["location_code"] == "muong-pon")
    assert muong_pon["source"] == "open-meteo:best_match"
    assert muong_pon["fetched_at"] is not None
