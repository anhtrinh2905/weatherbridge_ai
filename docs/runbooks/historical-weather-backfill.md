# Historical weather backfill

This runbook loads the Điện Biên flash-flood/landslide inventory, backfills
Open-Meteo forecast and reanalysis products, checks data quality, and exports
CSV files for offline model development.

## Data products

| Product | Database table | Intended use |
|---|---|---|
| Historical Forecast | `forecast_hourly` | Near-analysis model series from 2021/2022 onward |
| Previous Runs | `forecast_hourly` | Forecast skill at fixed lead times 0-7 days; mostly from 2024 |
| Historical Weather best match | `weather_observation_hourly` | ERA5/ERA5-Land reference, not an issued forecast |
| Public disaster inventory | `disaster_events`, `disaster_event_locations` | Labels and provenance |

Historical Forecast stitches early hours from successive runs. Do not use it to
claim what a 7-day forecast said. Use Previous Runs for lead-time evaluation.

## Bootstrap

Start PostgreSQL and apply migrations:

```bash
docker compose up -d db
make migrate
make hazard-seed
```

After a code merge, use the idempotent sync command rather than recreating the
database:

```bash
make research-db-sync
```

It runs migrations, seeds the catalog, and verifies that the persisted database
still contains forecast and observation rows. It does not delete collected
data. Use `make research-db-collect` only for an explicit new collection run.

Before a production sync or schema migration, create a database backup:

```bash
make research-db-backup
```

Regenerate the small versioned catalog CSV views:

```bash
make hazard-catalog-csv
```

## Backfill

The default command covers all configured sampling communes and continues past
individual upstream failures:

```bash
make weather-backfill
```

For a controlled first run, use one location and a short interval:

```bash
PYTHONPATH=worker/src:be/src uv run --project worker \
  python worker/src/backfill_cli.py backfill \
  --start-date 2024-07-01 \
  --end-date 2024-07-31 \
  --products previous_runs archive \
  --locations commune-muong-pon
```

Requests are split by calendar month. Writes use unique natural keys and native
PostgreSQL upserts, so rerunning a range updates rows instead of duplicating
them. `ingestion_runs` records parameters, status, row count, response SHA-256,
and errors.

The API can enqueue the same operation through the admin-only endpoint:

```text
POST /api/v1/admin/hazard-archive/backfills
```

## Quality checks

```bash
make weather-quality
```

`training_ready=true` only means both forecast and observation rows exist. It
does not mean all village coordinates are verified. Review unresolved locations
through:

```text
GET /api/v1/admin/hazard-archive/locations?unresolved_only=true
GET /api/v1/admin/hazard-archive/coverage
```

Open-Meteo snaps requested coordinates to its model grid. Both requested and
returned coordinates are stored. Missing or unsupported variables remain NULL
and are listed in `quality_flags`; they are never converted to zero.

The archive defaults to `best_match`: Open-Meteo combines ERA5 precipitation
with ERA5-Land soil moisture. Forcing `models=era5_land` can return NULL
precipitation and must not be used for the training export.

## CSV export

```bash
make training-csv
```

Output is written to `data/processed/training/`:

- `locations.csv`
- `disaster_events.csv`
- `disaster_event_locations.csv`
- `disaster_event_sources.csv`
- `forecast_hourly.csv`
- `weather_observation_hourly.csv`
- `ingestion_runs.csv`
- `training_samples.csv` (forecast features joined to observation targets)
- `manifest.json`

The worker exports in batches to avoid loading the complete archive into memory.
In Compose, `./data` is mounted at `/app/data`, so an admin-triggered export is
persisted on the host.

## Model-safety rules

- Keep Mường Pồn 2024 as backtest-only, consistent with the architecture.
- Use spatial/event-group splits, not random hourly-row splits.
- Keep `lead_hours`, model, data source, and quality flags in every training
  manifest.
- Do not treat commune centroids as exact disaster points.
- Do not commit generated weather CSV files or model artifacts.
