import csv
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from archive_operations import archive_quality_report, export_catalog_csv, export_training_csv
from hazard_archive import metadata, seed_disaster_catalog


async def test_catalog_and_database_csv_exports(tmp_path: Path) -> None:
    catalog_result = await export_catalog_csv(output_dir=tmp_path / "catalog")
    assert catalog_result["dien_bien_locations_v1.csv"] >= 20
    with (tmp_path / "catalog" / "dien_bien_locations_v1.csv").open(encoding="utf-8") as handle:
        locations = list(csv.DictReader(handle))
    assert any(row["code"] == "commune-muong-pon" for row in locations)

    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    try:
        async with factory() as session:
            await seed_disaster_catalog(session)
            export_result = await export_training_csv(session, tmp_path / "training")
            quality = await archive_quality_report(session)
            assert export_result["locations.csv"] >= 20
            assert (tmp_path / "training" / "forecast_hourly.csv").exists()
            assert quality["sampling_locations"] == 7
            assert quality["training_ready"] is False
    finally:
        await engine.dispose()
