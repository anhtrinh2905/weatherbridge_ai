# Deployment topology

## Development

The root `compose.yaml` is a complete local topology. `docker compose up` builds the
frontend, API, worker, Keycloak theme, and proxy images; starts PostgreSQL, Redis,
Mailpit, and Keycloak; applies migrations as a one-off job; and gates dependent
services on readiness checks.

### Compose file layout

Two compose trees coexist deliberately; they are not two sources of truth for the same thing:

- **Root `compose.yaml`** — the single canonical local topology. `make dev` and the
  Story 1.1 `docker compose up` path both use it. It builds `fe`/`be`/`worker`/`keycloak`/`proxy`,
  starts PostgreSQL/Redis/Mailpit/Keycloak, and runs migrations as a one-off `migrate` job.
  Dev bootstrap credentials come from `${VAR:-default}` interpolation (defaults documented in
  `.env.example`); no credential literals are committed.
- **`infra/compose/compose.yaml` (+ `.dev`/`.prod`/`.ai` overlays)** — an infra-only subset
  (db, keycloak-db, redis, mailpit, keycloak) used by `make dev-prod` and `make dev-ai`. It never
  defines the application services and is not a substitute for the root topology.

## Single-server production

Use `compose.prod.yaml` only for a deliberately managed single Docker host. It
removes source mounts, uses restart policies, and places Nginx in front of the
frontend and API.

## Cloud production

Use one immutable image per deploy unit:

- `fe`: static web image or CDN artifact.
- `be`: stateless HTTP service.
- `worker`: independently scaled background process.
- optional `model-server`: GPU or managed inference service.
- optional `litellm`: OpenAI-compatible model gateway, deployed as a backing service rather than imported into the API process.
- optional `langfuse`: external or self-hosted LLM observability service called by the backend adapter.

Use managed PostgreSQL, Redis, object storage, secret management, a container
registry, and centralized telemetry. The provider-specific Terraform modules
belong under `infra/terraform/environments/` after the cloud target is chosen.
