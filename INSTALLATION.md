# WeatherBridge AI Installation Guide

This guide covers the recommended Docker Compose installation, demo verification, optional local
development, and research-data commands.

## Recommended: Docker Compose

Docker Compose is the canonical setup. It builds all application images, creates both PostgreSQL
databases, imports the local Keycloak realm, applies Alembic migrations, and starts the API,
worker, frontend, and reverse proxy in dependency order.

### Prerequisites

- Git
- Docker Engine with the Compose plugin (`docker compose`)
- At least 8 GB RAM recommended for building and running the complete local stack
- Internet access on the first build to download container images and dependencies
- Internet access to display live Open-Meteo data; the public demo uses simulated fallback data
  when Open-Meteo cannot be reached

Node.js, Python, `uv`, `pnpm`, and a local `.env` file are **not required** for this path.

### 1. Clone The Repository

```bash
git clone git@github.com:anhtrinh2905/weatherbridge_ai.git
cd weatherbridge_ai
```

Use the HTTPS GitHub URL instead if SSH authentication is not configured.

### 2. Validate Compose Configuration

```bash
docker compose config --quiet
```

A successful validation exits without output.

### 3. Build And Start Everything

```bash
docker compose up --build
```

Keep this terminal open to inspect startup logs. For detached mode, use:

```bash
docker compose up -d --build
docker compose ps
```

Wait until `db`, `keycloak-db`, `redis`, `keycloak`, `be`, `fe`, and `proxy` are running and the
services with health checks report `healthy`. The one-shot `migrate` service should exit with code
`0` after applying database migrations.

### 4. Open The Application

| Service | URL or connection | Local credentials |
|---|---|---|
| Public interactive demo | http://localhost:5173/demo | No login required |
| Landing page | http://localhost:5173 | None |
| FastAPI documentation | http://localhost:8000/docs | Protected routes require a Bearer token |
| API readiness | http://localhost:8000/api/v1/health/ready | None |
| Keycloak admin | http://localhost:8080/admin | `admin` / `admin` |
| Mailpit | http://localhost:8025 | None |
| PostgreSQL | `localhost:5432`, database `weather_bridge` | `vai` / `vai` |

All passwords in this table are development defaults. Never use them in a shared or production
environment.

### 5. Verify The Installation

```bash
curl --fail http://localhost:8000/api/v1/health/ready
curl --fail --output /dev/null http://localhost:5173/demo
curl --fail --output /dev/null \
  http://localhost:8080/realms/weather-bridge/.well-known/openid-configuration
```

Expected API response:

```json
{"status":"ready"}
```

Then open `/demo` and verify that you can:

1. Change the role between resident, village head, commune officer, and administrator.
2. Move through the 5-day forecast horizon.
3. Switch between flash-flood and landslide views.
4. Change the warning threshold in Officer mode and see the alert list update.
5. See either `Open-Meteo` or `simulated` in the forecast-source indicator.

## Local Demo Accounts

The local Keycloak realm seeds four users. All use password `Demo@12345`.

| Role | Username | Default route after login |
|---|---|---|
| Administrator | `admin@weather-bridge.local` | `/admin/overview` |
| Commune officer | `canbo@weather-bridge.local` | `/officer/heatmap` |
| Village head | `truongban@weather-bridge.local` | `/village-head/overview` |
| Resident | `dan@weather-bridge.local` | `/resident` |

These accounts still use the normal Keycloak OIDC Authorization Code + PKCE flow. They do not
bypass authentication.

## Runtime Configuration

No configuration file is needed for the default local stack. Compose uses safe local defaults from
`compose.yaml`. To override ports or credentials, create an uncommitted `.env` based on the
example:

```bash
cp .env.example .env
```

Common overrides:

```dotenv
POSTGRES_HOST_PORT=5432
POSTGRES_USER=vai
POSTGRES_PASSWORD=vai
POSTGRES_DB=weather_bridge
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=admin
```

If port `5432` is already in use, set `POSTGRES_HOST_PORT=5433`. If `5173`, `8000`, `8025`, or
`8080` is occupied, stop the conflicting process or update the relevant host-port mapping in a
local Compose override.

Do not commit `.env`. Production credentials must be supplied through a secret manager or
Kubernetes Secrets, not the repository.

## Useful Compose Commands

```bash
# Show service state
docker compose ps

# Follow all logs
docker compose logs --follow

# Follow selected services
docker compose logs --follow be worker proxy

# Rebuild after source changes
docker compose up -d --build

# Stop containers but preserve databases and Redis data
docker compose down

# Start existing containers again
docker compose up -d
```

To reset all local application and identity data, including users and database contents:

```bash
docker compose down --volumes
docker compose up --build
```

This reset is destructive and should only be used for disposable local data. It is required after
changing the Keycloak realm export because an import does not overwrite an existing realm.

## Optional: Refresh The Backend Forecast Snapshot

The public `/demo` route fetches Open-Meteo directly and needs no database seed. The authenticated
backend forecast API uses a worker-created PostgreSQL snapshot instead.

1. Sign in through the frontend with a local demo account.
2. Use the authenticated API to request a refresh:

```text
POST /api/v1/forecasts/muong-pon/refresh
```

3. After the worker completes the queued task, read the latest snapshot:

```text
GET /api/v1/forecasts/muong-pon/latest
```

Both endpoints require a valid Keycloak Bearer token. The refresh currently supports the Mường
Pồn location code only.

## Optional: Native Development

Use this mode when changing source code and you want Vite/FastAPI reload behavior. Docker Compose
remains the simpler demo path.

### Additional Prerequisites

- Python `3.14` as pinned by `.python-version` (project packages support Python `>=3.12,<3.15`)
- `uv`
- Node.js `24` as pinned by `.nvmrc`
- `pnpm 11.3.0`
- Docker Engine and Compose for PostgreSQL, Redis, Mailpit, and Keycloak
- GNU Make

### 1. Install Dependencies

```bash
make install
```

Equivalent commands:

```bash
uv sync --project be --extra speech
uv sync --project worker
uv sync --project ai
pnpm install
```

### 2. Start Infrastructure

```bash
make dev-infra
```

If this is the first native run, apply migrations:

```bash
make migrate
```

### 3. Start Development Processes

Run each command in a separate terminal from the repository root:

```bash
make api
```

```bash
make worker
```

```bash
pnpm dev
```

The Vite frontend is available at `http://localhost:5173`, and FastAPI is available at
`http://localhost:8000`.

## Optional: Historical Weather Research Data

These commands are not required for the UI demo. They populate the historical research archive
used for forecast-skill analysis and offline model development.

```bash
# Apply migrations and seed the Dien Bien event/location catalog
make hazard-seed

# Idempotently sync migrations, catalog, and persisted-data checks
make research-db-sync

# Explicitly collect configured Open-Meteo historical products
make research-db-collect

# Run archive quality checks
make weather-quality

# Export training-oriented CSV files to data/processed/training/
make training-csv
```

Collection can make many external API requests and should be run intentionally. Generated CSVs
and model artifacts must not be committed. See
[`docs/runbooks/historical-weather-backfill.md`](docs/runbooks/historical-weather-backfill.md) for
product semantics, quality flags, and a controlled one-location example.

## Quality Checks

For native development dependencies:

```bash
make check
make test
make build
```

- `make check` runs frontend lint/typecheck plus Python Ruff and MyPy checks.
- `make test` runs frontend, backend, worker, and offline-AI test suites.
- `make build` builds the frontend and all production container images.

Run the narrowest relevant check first while developing, then the full sequence before release.

## Troubleshooting

### A Service Is Unhealthy

```bash
docker compose ps
docker compose logs be worker keycloak proxy
```

The API waits for successful migrations, Redis health, and Keycloak readiness. Fix the first
failing dependency rather than repeatedly restarting the API.

### Port Already In Use

Inspect the error from `docker compose up`. The default published ports are `5173`, `5432`, `8000`,
`8025`, and `8080`. Override PostgreSQL with `POSTGRES_HOST_PORT`; use a local Compose override for
other host ports.

### PostGIS Image Has No ARM64 Manifest

On Apple Silicon you may see:

```text
no matching manifest for linux/arm64/v8
```

Official `postgis/postgis:16-3.5-alpine` is published for `linux/amd64` only. Compose sets
`platform: linux/amd64` on the `db` service so Docker Desktop can pull and run it under emulation.
Ensure Docker Desktop → Settings → General has Rosetta / virtualization support enabled, then retry:

```bash
docker compose up --build
```

### Keycloak Changes Do Not Appear

Realm imports only initialize a new Keycloak database. For disposable local data, recreate the
volumes:

```bash
docker compose down --volumes
docker compose up --build
```

### Demo Shows Simulated Data

This is expected when the browser cannot reach Open-Meteo or the request is blocked. The warning
experience remains deterministic and interactive. Check browser network access to
`https://api.open-meteo.com/v1/forecast` to restore the live rainfall source.

### Docker Build Uses Stale Source

```bash
docker compose build --no-cache be worker fe
docker compose up -d
```

## Deployment

Local installation does not imply production readiness. The repository includes isolated K3s
development and production overlays, immutable GHCR image tags, migration init containers, and a
pull-based deployment agent. Production setup additionally requires non-default Secrets, DNS/TLS,
SMTP, backups, monitoring, provider-license review, and safety approval.

See [`infra/k8s/README.md`](infra/k8s/README.md) and
[`docs/runbooks/deployment.md`](docs/runbooks/deployment.md) for deployment details.
