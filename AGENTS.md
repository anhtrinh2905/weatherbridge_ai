# Repository Agent Instructions

## Scope

This file is the source of truth for agents working in this repository. Read it
before editing code. `CLAUDE.md` and the files under `.opencode/` add runtime-

## Product boundaries

- `fe/` owns browser UI and API client code.
- `be/` owns HTTP transport, authentication, business modules, and migrations.
- `worker/` owns asynchronous jobs and must remain independently deployable.
- `be/src/ai/` owns online model providers, retrieval, inference contracts, and LLM observability.
- `ai/` owns offline dataset preparation, training, pretraining, and evaluation entrypoints.
- `infra/` owns runtime packaging and deployment; it must not contain business logic.

## Engineering rules

- Prefer the smallest correct change.
- Keep route handlers thin and put business logic in module services.
- Keep database models, API schemas, and AI contracts separate.
- Never put secrets, real personal data, medical data, model weights, or `.env` files in Git.
- Never use `localStorage` for authentication tokens.
- Use `uv` for Python dependencies and `pnpm` for frontend dependencies.
- Update tests and documentation with behavior changes.
- Use the generated OpenAPI client in `fe/src/shared/api/` instead of duplicating DTOs.
- Do not run model training or GPU inference inside the API request process.
- Do not add a dependency without checking maintenance, security, and license status.

## Verification

Run the narrowest relevant checks first, then the full suite:

```bash
make check
make test
make build
```

## Compliance

- Record copied or vendored source in `THIRD_PARTY_NOTICES.md`.
- Record external repositories, exact commits, licenses, and modifications in `docs/compliance/oss-register.yaml`.
- Record dataset and model provenance before using them.
- Record actual AI-assisted development activity; never fabricate a development history.

## Safety

- Do not run destructive Git or filesystem commands without explicit approval.
- Do not commit secrets.
- Do not change unrelated user work.
- Do not claim a test passed unless it was run.
