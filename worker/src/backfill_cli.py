"""Operator CLI for seeding and backfilling the hazard research archive."""

import argparse
import asyncio
import json
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from archive_operations import archive_quality_report, export_catalog_csv, export_training_csv
from hazard_archive import seed_disaster_catalog
from open_meteo_backfill import backfill_open_meteo
from settings import Settings


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("seed", help="Load the versioned Điện Biên event/location catalog")
    subparsers.add_parser("catalog-csv", help="Regenerate versioned CSV files from the catalog")
    export = subparsers.add_parser(
        "export-csv", help="Export normalized database tables for training"
    )
    export.add_argument(
        "--tables",
        nargs="+",
        choices=[
            "locations",
            "disaster_events",
            "disaster_event_locations",
            "disaster_event_sources",
            "forecast_hourly",
            "weather_observation_hourly",
            "ingestion_runs",
            "training_samples",
        ],
        default=None,
    )
    subparsers.add_parser("quality", help="Report archive completeness and ingestion failures")

    sync = subparsers.add_parser(
        "sync",
        help="Synchronize the catalog after deployment and verify persisted research data",
    )
    sync.add_argument(
        "--require-training-data",
        action="store_true",
        help="Exit non-zero when forecast or observation rows are missing",
    )
    sync.add_argument(
        "--collect",
        action="store_true",
        help="Run the configured historical backfill before verification",
    )
    sync.add_argument("--start-date", type=date.fromisoformat, default=date(2021, 3, 23))
    sync.add_argument("--end-date", type=date.fromisoformat, default=date.today())
    sync.add_argument(
        "--products",
        nargs="+",
        choices=["historical_forecast", "previous_runs", "archive"],
        default=["historical_forecast", "previous_runs", "archive"],
    )
    sync.add_argument("--locations", nargs="+", default=None)
    sync.add_argument("--forecast-model", default="gfs_seamless")
    sync.add_argument("--archive-model", default="best_match")
    sync.add_argument("--export", action="store_true")

    backfill = subparsers.add_parser("backfill", help="Backfill normalized Open-Meteo data")
    backfill.add_argument("--start-date", type=date.fromisoformat, default=date(2021, 3, 23))
    backfill.add_argument("--end-date", type=date.fromisoformat, default=date.today())
    backfill.add_argument(
        "--products",
        nargs="+",
        choices=["historical_forecast", "previous_runs", "archive"],
        default=["historical_forecast", "previous_runs", "archive"],
    )
    backfill.add_argument("--locations", nargs="+", default=None)
    backfill.add_argument("--forecast-model", default="gfs_seamless")
    backfill.add_argument("--archive-model", default="best_match")
    backfill.add_argument("--continue-on-error", action="store_true")
    return parser


async def run(args: argparse.Namespace) -> dict:
    if args.command == "catalog-csv":
        return await export_catalog_csv()
    settings = Settings()
    engine = create_async_engine(settings.database_url, pool_pre_ping=True)
    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    try:
        async with session_factory() as session:
            if args.command == "seed":
                return await seed_disaster_catalog(session)
            if args.command == "export-csv":
                return await export_training_csv(session, tables=args.tables)
            if args.command == "quality":
                return await archive_quality_report(session)
            if args.command == "sync":
                seed_result = await seed_disaster_catalog(session)
                collection_result = None
                if args.collect:
                    collection_result = await backfill_open_meteo(
                        session,
                        settings,
                        start_date=args.start_date,
                        end_date=args.end_date,
                        products=args.products,
                        location_codes=args.locations,
                        forecast_model=args.forecast_model,
                        archive_model=args.archive_model,
                        continue_on_error=True,
                    )
                quality_result = await archive_quality_report(session)
                export_result = None
                if args.export:
                    export_result = await export_training_csv(session)
                result = {
                    "seed": seed_result,
                    "collection": collection_result,
                    "quality": quality_result,
                    "export": export_result,
                }
                if args.require_training_data and not quality_result["training_ready"]:
                    raise RuntimeError(
                        "research database has no complete forecast and observation data"
                    )
                return result
            return await backfill_open_meteo(
                session,
                settings,
                start_date=args.start_date,
                end_date=args.end_date,
                products=args.products,
                location_codes=args.locations,
                forecast_model=args.forecast_model,
                archive_model=args.archive_model,
                continue_on_error=args.continue_on_error,
            )
    finally:
        await engine.dispose()


def main() -> None:
    result = asyncio.run(run(build_parser().parse_args()))
    print(json.dumps(result, ensure_ascii=False, indent=2, default=str))


if __name__ == "__main__":
    main()
