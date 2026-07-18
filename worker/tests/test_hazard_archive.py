from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from hazard_archive import (
    disaster_event_locations,
    disaster_event_sources,
    disaster_events,
    geo_locations,
    metadata,
    seed_disaster_catalog,
)


async def test_seed_catalog_is_complete_and_idempotent() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    try:
        async with factory() as session:
            first = await seed_disaster_catalog(session)
            second = await seed_disaster_catalog(session)

            assert first == second
            assert first["locations"] >= 20
            assert first["events"] == 3
            assert (
                await session.scalar(select(func.count()).select_from(geo_locations))
                == first["locations"]
            )
            assert await session.scalar(select(func.count()).select_from(disaster_events)) == 3
            assert (
                await session.scalar(select(func.count()).select_from(disaster_event_locations))
                == first["event_locations"]
            )
            assert (
                await session.scalar(select(func.count()).select_from(disaster_event_sources))
                == first["event_sources"]
            )

            unresolved = await session.scalar(
                select(func.count())
                .select_from(geo_locations)
                .where(geo_locations.c.coordinate_confidence == "unresolved")
            )
            sampling = await session.scalar(
                select(func.count())
                .select_from(geo_locations)
                .where(geo_locations.c.is_sampling_location.is_(True))
            )
            assert unresolved and unresolved > 0
            assert sampling == 7
    finally:
        await engine.dispose()
