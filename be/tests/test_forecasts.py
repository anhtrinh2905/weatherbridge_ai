from datetime import UTC, datetime
from uuid import UUID

from database.models import ForecastSnapshot
from httpx import AsyncClient


async def test_latest_returns_404_before_first_ingest(client: AsyncClient) -> None:
    response = await client.get("/api/v1/forecasts/muong-pon/latest")
    assert response.status_code == 404
    assert response.json()["code"] == "forecast_not_found"


async def test_latest_returns_most_recent_snapshot(client: AsyncClient, db_session) -> None:
    for day, fetched in (("2026-07-17", 17), ("2026-07-18", 18)):
        db_session.add(
            ForecastSnapshot(
                location_code="muong-pon",
                latitude=21.59,
                longitude=103.03,
                source="open-meteo:best_match",
                days=[{"date": day, "rainfall_mm": 10.0, "peak_intensity_mm_h": 2.0}],
                fetched_at=datetime(2026, 7, fetched, tzinfo=UTC),
            )
        )
    await db_session.commit()

    response = await client.get("/api/v1/forecasts/muong-pon/latest")
    assert response.status_code == 200
    body = response.json()
    assert body["days"][0]["date"] == "2026-07-18"
    assert body["source"] == "open-meteo:best_match"


async def test_unknown_location_is_404(client: AsyncClient) -> None:
    response = await client.get("/api/v1/forecasts/nowhere/latest")
    assert response.status_code == 404
    assert response.json()["code"] == "location_not_found"


async def test_refresh_queues_forecast_ingest_job(client: AsyncClient) -> None:
    response = await client.post("/api/v1/forecasts/muong-pon/refresh")
    assert response.status_code == 202
    body = response.json()
    assert body["status"] == "queued"
    UUID(body["job_id"])  # valid job id

    job = await client.get(f"/api/v1/ai/jobs/{body['job_id']}")
    assert job.status_code == 200
    assert job.json()["task"] == "forecast_ingest"
