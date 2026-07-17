# Architecture

## Runtime boundaries

- `fe/` is a browser application and never talks to PostgreSQL or Redis directly.
- `be/` is the HTTP API. Its `src/` directory contains the application code directly; there is no extra package namespace.
- `worker/` is a separate process for long-running jobs and imports the backend AI runtime.
- `be/src/ai/` contains online providers, retrieval contracts, inference, and LLM observability.
- `ai/` contains offline training, pretraining, dataset, and evaluation entrypoints only.
- `infra/` contains deployment resources, Docker, Compose, Keycloak, and observability configuration.

## Authentication

Keycloak owns users, passwords, email verification, recovery, sessions, and
future social identity providers. The frontend uses Authorization Code with PKCE
and keeps tokens in memory. The API validates the access token signature with
Keycloak JWKS and checks issuer, algorithm, expiry, and client binding.

## Data flow

1. `fe` starts the OIDC flow against Keycloak.
2. Keycloak returns an access token to the browser.
3. `fe` sends the token as a Bearer header to `be`.
4. `be` validates the token and creates an AI job if needed.
5. Redis carries the job identifier to `worker`.
6. `worker` calls the backend AI runtime in `be/src/ai`, writes the result to PostgreSQL, and exits the job.

## Design choices

- Use feature modules and application services instead of global god-services.
- Keep database models, HTTP schemas, and AI contracts separate.
- Keep training dependencies out of the API image.
- Run database migrations as a release step, not from every API replica.
