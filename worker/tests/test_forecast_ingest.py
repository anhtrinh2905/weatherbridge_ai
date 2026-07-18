
import httpx
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from forecast_ingest import build_days, forecast_snapshots, ingest_forecast, metadata
from settings import Settings

OPEN_METEO_RESPONSE = {
    "daily": {
        "time": ["2026-07-18", "2026-07-19", "2026-07-20"],
        "precipitation_sum": [13.3, 27.8, None],
    },
    "hourly": {
        "time": ["2026-07-18T00:00", "2026-07-18T01:00", "2026-07-19T00:00"],
        "precipitation": [1.2, 4.5, 2.0],
        "visibility": [800, 1200, 5000],
        "temperature_2m": [18.0, 19.0, 21.0],
        "dew_point_2m": [17.0, 17.4, 16.0],
    },
}


@pytest.fixture
async def session_factory():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(metadata.create_all)
    yield async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    await engine.dispose()


def mock_client(handler) -> httpx.AsyncClient:
    return httpx.AsyncClient(transport=httpx.MockTransport(handler))


def test_build_days_maps_rainfall_and_peak_intensity() -> None:
    days = build_days(OPEN_METEO_RESPONSE)
    assert days == [
        {
            "date": "2026-07-18",
            "rainfall_mm": 13.3,
            "peak_intensity_mm_h": 4.5,
            "min_visibility_m": 800.0,
            "temperature_2m_c": 18.5,
            "dew_point_2m_c": 17.2,
        },
        {
            "date": "2026-07-19",
            "rainfall_mm": 27.8,
            "peak_intensity_mm_h": 2.0,
            "min_visibility_m": 5000.0,
            "temperature_2m_c": 21.0,
            "dew_point_2m_c": 16.0,
        },
        {"date": "2026-07-20", "rainfall_mm": 0.0, "peak_intensity_mm_h": 0.0},
    ]


async def test_ingest_persists_snapshot(session_factory) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if str(request.url).endswith("/infer"):
            return httpx.Response(200, json={
                "webp_base64": "UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==",
                "geojson": {"type": "FeatureCollection", "features": []},
                "bbox": [103.0, 21.0, 103.2, 21.2]
            })

        assert "precipitation" in request.url.params["hourly"]
        assert "visibility" in request.url.params["hourly"]
        assert request.url.params["forecast_days"] == "8"
        return httpx.Response(200, json=OPEN_METEO_RESPONSE)

    async with session_factory() as session, mock_client(handler) as client:
        settings = Settings(open_meteo_base_url="https://api.test/v1/forecast")
        result = await ingest_forecast(
            session, {"location_code": "muong-pon"}, settings, client
        )

    assert result["location_code"] == "muong-pon"
    assert result["days_ingested"] == 3
    assert result["source"] == "open-meteo:best_match"

    async with session_factory() as session:
        cursor = await session.execute(select(forecast_snapshots))
        row = cursor.mappings().one()
        assert row["location_code"] == "muong-pon"
        assert row["latitude"] == 21.59
        assert len(row["days"]) == 3


async def test_ingest_fails_safely_and_keeps_previous_snapshot(session_factory) -> None:
    ok = {"count": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        if str(request.url).endswith("/infer"):
            return httpx.Response(200, json={
                "webp_base64": "UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==",
                "geojson": {"type": "FeatureCollection", "features": []},
                "bbox": [103.0, 21.0, 103.2, 21.2]
            })

        ok["count"] += 1
        if ok["count"] == 1:
            return httpx.Response(200, json=OPEN_METEO_RESPONSE)
        return httpx.Response(503)

    async with session_factory() as session, mock_client(handler) as client:
        settings = Settings(open_meteo_base_url="https://api.test/v1/forecast")
        await ingest_forecast(
            session, {"location_code": "muong-pon"}, settings, client
        )

        with pytest.raises(httpx.HTTPStatusError):
            await ingest_forecast(
                session, {"location_code": "muong-pon"}, settings, client
            )
        rows = (await session.execute(select(forecast_snapshots))).mappings().all()
        assert len(rows) == 1  # the good snapshot survives the failed run


async def test_ingest_rejects_unknown_location(session_factory) -> None:
    async with session_factory() as session:
        with pytest.raises(ValueError, match="unknown forecast location"):
            await ingest_forecast(
                session, {"location_code": "nowhere"}, "https://api.test/v1/forecast"
            )
