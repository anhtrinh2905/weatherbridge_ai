# Story 1.1: Scaffold the modular monorepo and local topology

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want the `fe/`, `be/`, `worker/`, `ai/`, `infra/` structure with a one-command local Docker topology,
so that the team has a running, deployable skeleton to build every feature on.

## Acceptance Criteria

**AC1 — One-command local topology comes up healthy**
**Given** a clean clone
**When** I run `docker compose up`
**Then** the frontend, API, worker, Keycloak (with theme), proxy, PostgreSQL, Redis, and Mailpit start with readiness gates
**And** database migrations run as a one-off job, not from an API replica
**And** `be` exposes a health endpoint that returns ok and `fe` serves a placeholder shell.

**AC2 — Runtime boundaries and hygiene hold**
**Given** the runtime boundaries in `docs/architecture`
**When** I inspect the scaffold
**Then** `fe` has no direct PostgreSQL/Redis access, `ai/` contains only offline entrypoints, and no secrets or `.env` files are committed.

## Tasks / Subtasks

> ⚠️ **This is a RECONCILE-AND-VERIFY story, not greenfield.** The scaffold already exists on `dev`
> (`fe/`, `be/`, `worker/`, `ai/`, `infra/`, root `compose.yaml`, `Makefile`, `pnpm-workspace.yaml`,
> `be/migrations/versions/0001_initial.py`, all five Dockerfiles). Do **not** re-create these. Your job
> is to prove the ACs pass end-to-end and close the specific gaps listed below. See Dev Notes → "Current
> scaffold state" before touching anything.

- [ ] **Task 1: Prove the full topology boots from a clean state (AC1)**
  - [ ] From repo root run `docker compose up --build` (root `compose.yaml` is the canonical local topology — see Dev Notes "Compose divergence")
  - [ ] Confirm all services reach healthy/started: `db`, `keycloak-db`, `redis`, `mailpit`, `keycloak`, `migrate` (one-off), `be`, `worker`, `fe`, `proxy`
  - [ ] Confirm `migrate` runs as a one-off job (`restart: "no"`, `depends_on: db service_healthy`) and `be` waits on `migrate` `service_completed_successfully` — migrations must NOT run from the `be` replica
  - [ ] Hit the `be` health endpoint (route is mounted at `/health` via `be/src/api/v1/router.py`) and confirm it returns ok; confirm `fe` serves its placeholder shell (`fe/src/app/App.tsx` → `WorkspacePage`) through the `proxy`
  - [ ] Document the exact `docker compose up` command, the URLs checked, and the observed health output in the Dev Agent Record (do not claim success without running it)

- [ ] **Task 2: Verify readiness gates are correct, not just present (AC1)**
  - [ ] Review every `healthcheck:` and `depends_on: { condition: ... }` in root `compose.yaml`; confirm `be`/`worker`/`proxy` gate on their dependencies' health, and `keycloak` gates on `keycloak-db`
  - [ ] Confirm `keycloak` image builds from `infra/docker/keycloak.Dockerfile`, which imports `infra/keycloak/realm-export.json` and copies `infra/keycloak/themes/weather-bridge` (theme referenced by AC1 "Keycloak (with theme)")

- [ ] **Task 3: Resolve the two-compose divergence (AC1 correctness / prevent-confusion)**
  - [ ] Root `compose.yaml` = full local topology (used by `make dev`). `infra/compose/compose.yaml` = infra-only subset (db, keycloak-db, redis, mailpit, keycloak), layered by `make dev-prod`/`make dev-ai`
  - [ ] `docs/architecture/deployment.md` states the **root** `compose.yaml` is the complete local topology — reconcile: either make `make dev-prod`/`dev-ai` layer on the root file, or document the split explicitly so the two systems don't drift. Prefer the **smallest** change that makes the docs and Makefile consistent; record the decision in Dev Notes
  - [ ] Ensure `make dev` (root `docker compose up -d`) and the AC1 `docker compose up` path refer to the same topology

- [ ] **Task 4: Enforce boundary + hygiene invariants (AC2)**
  - [ ] `fe`: confirm no direct PostgreSQL/Redis client usage in `fe/src` (verified none at authoring time — re-check after any change). `fe` reaches data only via `be` HTTP + generated OpenAPI client under `fe/src/shared/api/`
  - [ ] `ai/`: confirm `ai/` holds only offline entrypoints (dataset/train/pretrain/eval/registry via `ai/src/main.py`), no HTTP API, no production image
  - [ ] `git ls-files` must show **no** `.env` file committed (`.env`/`.env.*` are gitignored, `.env.example` is the only allowed env file). Confirm `.env.example` documents required vars
  - [ ] **Secret-hygiene gap:** root `compose.yaml` currently hardcodes dev bootstrap passwords inline (Keycloak admin + Postgres). The ggshield hook flags these. Move them to env interpolation sourced from `.env` (defaults in `.env.example`), so no credential literal remains in a committed file. Keep local dev working with sensible non-production defaults. Record rationale — this directly serves AC2 "no secrets committed"

- [ ] **Task 5: Prove the developer entrypoints work (supports AC1/AC2)**
  - [ ] `make check` passes (fe lint+typecheck, be/worker/ai ruff, be mypy)
  - [ ] `make test` passes (fe vitest, be/worker/ai pytest) — or document any pre-existing failures unrelated to this story
  - [ ] `make build` builds all five images from `infra/docker/*.Dockerfile`
  - [ ] Record every command run and its result in the Dev Agent Record

## Dev Notes

### ⛔ Anti-reinvention: the scaffold already exists

At authoring time (branch `dev`) the monorepo is already scaffolded. **Extend/verify — do not recreate.** Reinventing these is the #1 failure mode for this story.

**Current scaffold state (verified by inspection):**

- **Root `compose.yaml` (canonical local topology)** — services: `db` (postgres:16-alpine), `keycloak-db` (postgres:16-alpine), `redis` (redis:7-alpine), `mailpit` (axllent/mailpit:v1.21), `keycloak` (built image), `migrate` (one-off, `restart: "no"`), `be`, `worker`, `fe`, `proxy`. Has `healthcheck:` blocks and `depends_on: { condition: service_healthy | service_completed_successfully }` gates. Named volumes: `weather-bridge-db`, `keycloak-db`, `weather-bridge-redis`.
- **`be/`** — FastAPI app. `be/src/main.py`; `be/src/api/v1/router.py` mounts `health`, `auth`, `ai_jobs` (health at prefix `/health`); `be/src/auth/keycloak.py`; `be/src/database/{models,session,base}.py`; `be/src/ai/contracts.py`; `be/src/queues/redis_queue.py`; `be/src/services/{ai_job_service,ai_inference_service}.py`; `be/src/core/{config,logging,lifespan,errors,time}.py`. Alembic: `be/alembic.ini`, `be/migrations/env.py`, `be/migrations/versions/0001_initial.py`.
- **`fe/`** — Vite + React + TS. `fe/src/main.tsx`, `fe/src/app/App.tsx`, `fe/src/app/ProtectedRoute.tsx`, `fe/src/pages/WorkspacePage.tsx` (placeholder shell), `vitest.config.ts`, `eslint.config.js`. No direct PG/Redis usage.
- **`worker/`** — separate `pyproject.toml`/`uv.lock`, `worker/src/main.py`, tests. Run path imports `be/src` (`PYTHONPATH=worker/src:be/src`).
- **`ai/`** — offline only: `ai/src/main.py` with `prepare|train|evaluate` subcommands, `ai/config.yaml`, notebooks/runs/data. No HTTP API.
- **`infra/`** — `infra/docker/{be,fe,worker,keycloak,proxy}.Dockerfile`; `infra/keycloak/realm-export.json`; `infra/keycloak/themes/weather-bridge/…`; `infra/compose/{compose.yaml,compose.dev.yaml,compose.prod.yaml,compose.ai.yaml}`; `infra/proxy`, `infra/litellm`, `infra/observability`, `infra/terraform`.
- **`scripts/`** — `export_openapi.py` (drives `make generate-contracts`), `install-bmad-skills.sh`.
- **`Makefile`** targets: `install`, `dev`, `dev-infra`, `dev-prod`, `dev-ai`, `api`, `worker`, `check`, `test`, `build`, `format`, `migrate`, `generate-contracts`, `ai-prepare/train/evaluate`.

### Relevant architecture patterns and constraints

- **Runtime boundaries** [Source: docs/architecture/README.md#Runtime-boundaries]: `fe` never talks to PostgreSQL/Redis directly; `be/src/` is the app code directly (no extra package namespace); `worker/` is a separate process that imports the backend AI runtime; `be/src/ai/` = online providers/retrieval/inference/observability; `ai/` = offline train/pretrain/dataset/eval only; `infra/` = deployment/Docker/Compose/Keycloak/observability.
- **Data flow** [Source: docs/architecture/README.md#Data-flow]: `fe` → OIDC → Keycloak → Bearer token → `be` validates → `be` creates AI job → Redis carries job id → `worker` calls `be/src/ai` → writes result to PostgreSQL → exits. (Only the plumbing needs to exist for this story; behavior lands in later epics.)
- **Migrations** [Source: docs/architecture/README.md#Design-choices; AR8]: run as a release/one-off job, **not** from every API replica. The `migrate` service enforces this; `be` gates on it via `service_completed_successfully`.
- **Modular monorepo, separate images** [Source: docs/adr/0001-modular-monorepo.md]: one repo, separate runtime images for fe/be/worker/(optional model-server). Deployment boundaries stay explicit.
- **Online/offline AI split** [Source: docs/adr/0003-online-offline-ai-split.md; AR10]: online adapters in `be/src/ai`, product use cases in `be/src/services`; `ai/` has no HTTP API or production image; training deps stay out of the API image.
- **Deployment topology** [Source: docs/architecture/deployment.md]: root `compose.yaml` is the **complete local topology** (`docker compose up` builds fe/api/worker/keycloak-theme/proxy; starts PG/Redis/Mailpit/Keycloak; applies migrations as a one-off; gates on readiness). `compose.prod.yaml` = single managed host. Cloud = one immutable image per deploy unit; `litellm`/`langfuse` are optional backing services, never imported into the API process.
- **Keycloak** [Source: docs/architecture/auth-keycloak.md; AR3/AR4]: local realm imported from `infra/keycloak/realm-export.json`; public browser client (no secret); custom login theme at `infra/keycloak/themes/weather-bridge/login`. For **this** story only the theme must exist and the Keycloak image must build/import — full login flow is Story 1.2/1.5. API never receives a client secret or user password.
- **Security & privacy** [Source: NFR6; AGENTS.md]: no `localStorage` for tokens (later stories), no real PII, no secrets/weights/`.env` in Git.

### Source tree components to touch

- Likely **UPDATE**: `compose.yaml` (move inline dev creds → env interpolation), possibly `Makefile` + `docs/architecture/deployment.md` (reconcile the compose split), `.env.example` (document any new vars).
- **VERIFY only** (do not rewrite): `infra/docker/*.Dockerfile`, `be/src/api/v1/endpoints/health.py`, `be/migrations/versions/0001_initial.py`, `fe/src/app/App.tsx`, `infra/keycloak/*`.
- Keep changes to the **smallest correct** set. If an AC already passes, verify and record — do not refactor for its own sake.

### Compose divergence (must resolve — Task 3)

Two compose systems currently coexist:
1. **Root `compose.yaml`** — full topology; driven by `make dev` (`docker compose up -d`) and the AC1 `docker compose up`.
2. **`infra/compose/compose.yaml` (+ `.dev/.prod/.ai` overlays)** — infra-only subset; driven by `make dev-prod` and `make dev-ai`.

`docs/architecture/deployment.md` names the **root** file as the complete local topology. Make the Makefile, docs, and the two compose trees mutually consistent with the smallest change, and record the decision. Do not silently leave two contradictory "sources of truth."

### Testing standards summary

- Commands: `make check` (fe lint+typecheck; be/worker/ai ruff; be mypy) and `make test` (fe **vitest**; be/worker/ai **pytest**). Build via `make build`.
- fe test setup: `fe/src/test/setup.ts`, `fe/vitest.config.ts`. Python tests live in `be/tests`, `worker/tests`, `ai/tests`.
- For this story, the primary "test" is the **end-to-end boot**: `docker compose up` reaching all-healthy plus a successful `be` health check and `fe` shell render. Capture real output — do not assert success without running.
- Tooling: `uv` for Python, `pnpm` for frontend (per AGENTS.md). Do not introduce a different package manager.

### Project Structure Notes

- Alignment: existing tree matches AR1 runtime boundaries exactly (`fe/be/worker/ai/infra`, `be/src/*`, `be/src/ai`, offline-only `ai/`). No structural conflict found.
- **Variance 1 (resolve):** dual compose trees (root vs `infra/compose/`) — see Task 3.
- **Variance 2 (resolve):** dev bootstrap credentials hardcoded inline in `compose.yaml` conflict with AC2 "no secrets committed" and trip the ggshield secret hook — see Task 4. Move to env interpolation with non-production defaults in `.env.example`.
- No new modules or naming conventions are introduced by this story.

### Latest tech / pinned versions (no upgrades in scope)

Images are pinned and should stay pinned for reproducibility: `postgres:16-alpine`, `redis:7-alpine`, `axllent/mailpit:v1.21`; Keycloak/be/fe/worker/proxy build from local Dockerfiles. Python via `uv` (`.python-version`), Node via `.nvmrc`, workspace via `pnpm-workspace.yaml`. Do **not** bump versions as part of this scaffolding story unless an AC forces it; version changes belong in their own change with provenance notes.

### References

- [Source: docs/epics.md#Story-1.1] — user story + acceptance criteria (BDD)
- [Source: docs/architecture/README.md#Runtime-boundaries] — fe/be/worker/ai/infra boundaries, data flow, migration-as-release-step
- [Source: docs/architecture/deployment.md#Development] — root `compose.yaml` = complete local topology with readiness gates + one-off migration
- [Source: docs/architecture/auth-keycloak.md#Local-setup] — realm import + custom login theme location
- [Source: docs/adr/0001-modular-monorepo.md] — modular monorepo, separate deploy images
- [Source: docs/adr/0003-online-offline-ai-split.md] — online AI in `be/src/ai`, offline ML in `ai/`
- [Source: AGENTS.md] — product boundaries, engineering rules, `uv`/`pnpm`, no secrets/`.env`/PII in Git, verification via `make check`/`make test`/`make build`

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
