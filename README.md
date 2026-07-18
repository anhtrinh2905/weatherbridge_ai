# weatherbridge_ai

> Scaffolded from the [VAI Code](https://github.com/namnv2004/V-AI-Code) starter, rebranded to Weather Bridge AI.

Production-oriented hackathon starter with a React/Vite frontend, FastAPI backend,
background worker, and an isolated AI runtime.

## Repository layout

- `fe/`: React, Vite, TypeScript, Tailwind CSS, and the Open Design handoff.
- `be/`: FastAPI HTTP application, Keycloak token validation, database migrations, and API tests.
- `worker/`: Redis-backed background jobs for AI inference, embeddings, and email.
- `ai/`: offline training, pretraining, dataset, and evaluation entrypoints only.
- `infra/`: Docker, Compose, reverse proxy, observability, and Terraform boundaries.
- `docs/`: architecture decisions, runbooks, AI documentation, and compliance records.
- `.opencode/` and `.claude/`: project agents, skills, and commands.

## Local requirement

- Docker Engine with Compose

## Quick start

```bash
docker compose up
```

Compose builds every application image, initializes both databases, imports the
Keycloak realm, runs Alembic migrations, and starts the API and worker in dependency
order. No local Node.js, Python, `uv`, `pnpm`, or `.env` file is required.

The frontend is available at `http://localhost:5173`.
The API is available at `http://localhost:8000`.
The API documentation is available at `http://localhost:8000/docs`.
Keycloak admin is available at `http://localhost:8080/admin` (`admin` / `admin`, local only).
Mailpit is available at `http://localhost:8025`.
PostgreSQL is available at `localhost:5432` (`vai` / `vai`, database `weather_bridge`).

## Checks

```bash
make check
make test
make build
```

## Authentication

Keycloak owns identity, registration, password policy, email verification,
password recovery, sessions, and social login extensions. The React client uses
OIDC Authorization Code with PKCE and keeps tokens in memory. The API validates
Bearer access tokens against Keycloak discovery metadata and cached JWKS keys.

## AI boundary

All online AI services live under `be/src/ai` and `be/src/services`. Training
code never runs in the API request process. The API creates a job and the worker
executes the backend AI service. LiteLLM is an OpenAI-compatible gateway and
Langfuse is an observability backing service; neither becomes a second Weather Bridge AI
API.

## Open-source and data use

See `THIRD_PARTY_NOTICES.md` and `docs/compliance/` before adding code, assets,
datasets, model weights, or external repositories. No real personal or medical
data belongs in this repository.
