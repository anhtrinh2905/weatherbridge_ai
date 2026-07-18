from datetime import UTC, date, datetime

import httpx
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from hazard_archive import (
    forecast_hourly,
    geo_locations,
    ingestion_runs,
    metadata,
    seed_disaster_catalog,
)
from open_meteo_backfill import (
    PREVIOUS_RUN_BASE_VARIABLES,
    ingest_chunk,
    month_chunks,
    parse_forecast_rows,
)
from settings import Settings


def previous_runs_response() -> dict:
    hourly: dict[str, list] = {"time": ["2024-07-25T00:00"]}
    for variable in PREVIOUS_RUN_BASE_VARIABLES:
        hourly[variable] = [1.0]
        for day in range(1, 8):
            hourly[f"{variable}_previous_day{day}"] = [float(day)]
    return {
        "latitude": 21.61406,
        "longitude": 103.00781,
        "hourly": hourly,
    }


def test_month_chunks_respect_calendar_boundaries() -> None:
    assert month_chunks(date(2024, 1, 30), date(2024, 3, 2)) == [
        (date(2024, 1, 30), date(2024, 1, 31)),
        (date(2024, 2, 1), date(2024, 2, 29)),
        (date(2024, 3, 1), date(2024, 3, 2)),
    ]


def test_parse_previous_runs_preserves_lead_and_grid_coordinates() -> None:
    rows = parse_forecast_rows(
        previous_runs_response(),
        source_id="source",
        location={
            "id": "location",
            "latitude": 21.5869655,
            "longitude": 103.0296833,
        },
        ingestion_run_id="run",
        product="previous_runs",
        model="gfs_seamless",
        retrieved_at=datetime(2026, 7, 18, tzinfo=UTC),
    )
    assert len(rows) == 8
    assert rows[0]["lead_hours"] == 0
    assert rows[7]["lead_hours"] == 168
    assert rows[7]["precipitation_mm"] == 7.0
    assert rows[7]["grid_latitude"] == 21.61406
    assert rows[7]["quality_flags"]["grid_snapped"] is True


async def test_ingest_chunk_is_idempotent() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.params["timezone"] == "UTC"
        assert request.url.params["models"] == "gfs_seamless"
        return httpx.Response(200, json=previous_runs_response())

    try:
        async with (
            factory() as session,
            httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client,
        ):
            await seed_disaster_catalog(session)
            location = (
                (
                    await session.execute(
                        select(geo_locations).where(geo_locations.c.code == "commune-muong-pon")
                    )
                )
                .mappings()
                .one()
            )
            settings = Settings(
                database_url="sqlite+aiosqlite:///:memory:",
                open_meteo_previous_runs_url="https://api.test/previous-runs",
            )
            for _ in range(2):
                count = await ingest_chunk(
                    session,
                    settings,
                    client,
                    product="previous_runs",
                    model="gfs_seamless",
                    location=dict(location),
                    start_date=date(2024, 7, 25),
                    end_date=date(2024, 7, 25),
                )
                assert count == 8

            assert await session.scalar(select(func.count()).select_from(forecast_hourly)) == 8
            assert await session.scalar(select(func.count()).select_from(ingestion_runs)) == 2
    finally:
        await engine.dispose()
