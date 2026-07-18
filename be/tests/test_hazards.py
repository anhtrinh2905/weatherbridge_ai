from datetime import UTC, datetime

from httpx import AsyncClient

from database.models import ForecastSnapshot


async def test_latest_returns_404_before_first_ingest(client: AsyncClient) -> None:
    response = await client.get("/api/v1/hazards/muong-pon/latest")
    assert response.status_code == 404
    assert response.json()["code"] == "forecast_not_found"


async def test_unknown_location_is_404(client: AsyncClient) -> None:
    response = await client.get("/api/v1/hazards/nowhere/latest")
    assert response.status_code == 404
    assert response.json()["code"] == "location_not_found"


async def test_latest_returns_risk_with_level_name(client: AsyncClient, db_session) -> None:
    db_session.add(
        ForecastSnapshot(
            location_code="muong-pon",
            latitude=21.59,
            longitude=103.03,
            source="open-meteo:best_match",
            days=[
                {
                    "date": "2026-07-19",
                    "rainfall_mm": 42.0,
                    "peak_intensity_mm_h": 9.0,
                    "corrected_rainfall_mm": 38.0,
                    "bias_corrected": True,
                    "id_exceedance": 1.6,
                    "trigger_level": 3,
                    "risk_level": 3,
                }
            ],
            fetched_at=datetime(2026, 7, 19, tzinfo=UTC),
        )
    )
    await db_session.commit()

    response = await client.get("/api/v1/hazards/muong-pon/latest")
    assert response.status_code == 200
    body = response.json()
    assert body["location_code"] == "muong-pon"
    day = body["days"][0]
    assert day["risk_level"] == 3
    assert day["risk_name"] == "cao"  # numeric level labelled by the service
    assert day["trigger_level"] == 3
    assert day["corrected_rainfall_mm"] == 38.0


async def test_latest_tolerates_unscored_legacy_snapshot(client: AsyncClient, db_session) -> None:
    # A snapshot written before the scoring pipeline has no risk fields.
    db_session.add(
        ForecastSnapshot(
            location_code="muong-pon",
            latitude=21.59,
            longitude=103.03,
            source="open-meteo:best_match",
            days=[{"date": "2026-07-19", "rainfall_mm": 5.0, "peak_intensity_mm_h": 1.0}],
            fetched_at=datetime(2026, 7, 18, tzinfo=UTC),
        )
    )
    await db_session.commit()

    response = await client.get("/api/v1/hazards/muong-pon/latest")
    assert response.status_code == 200
    day = response.json()["days"][0]
    assert day["risk_level"] is None
    assert day["risk_name"] is None
