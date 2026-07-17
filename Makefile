.PHONY: install dev dev-infra dev-ai ai-prepare ai-train ai-evaluate api worker check test build format migrate generate-contracts

install:
	uv sync --project be
	uv sync --project worker
	uv sync --project ai
	pnpm install

dev-infra:
	docker compose -f infra/compose/compose.yaml -f infra/compose/compose.dev.yaml up -d

dev:
	docker compose -f infra/compose/compose.yaml -f infra/compose/compose.dev.yaml up -d

dev-prod:
	docker compose -f infra/compose/compose.yaml -f infra/compose/compose.prod.yaml up -d --build

dev-ai:
	docker compose -f infra/compose/compose.yaml -f infra/compose/compose.dev.yaml -f infra/compose/compose.ai.yaml up -d --build

ai-prepare:
	PYTHONPATH=ai/src uv run --project ai python ai/src/main.py prepare

ai-train:
	PYTHONPATH=ai/src uv run --project ai python ai/src/main.py train

ai-evaluate:
	PYTHONPATH=ai/src uv run --project ai python ai/src/main.py evaluate

api:
	uv run --project be uvicorn --app-dir be/src main:app --reload --host 0.0.0.0 --port 8000

worker:
	PYTHONPATH=worker/src:be/src uv run --project worker python worker/src/main.py

check:
	pnpm --dir fe lint
	pnpm --dir fe typecheck
	uv run --project be ruff check be/src be/tests
	uv run --project be mypy be/src
	uv run --project worker ruff check worker/src worker/tests
	uv run --project ai ruff check ai/src ai/tests

test:
	pnpm --dir fe test
	uv run --project be pytest be/tests
	uv run --project worker pytest worker/tests
	uv run --project ai pytest ai/tests

build:
	pnpm --dir fe build
	docker build -f infra/docker/be.Dockerfile -t vai-code-be .
	docker build -f infra/docker/worker.Dockerfile -t vai-code-worker .
	docker build -f infra/docker/fe.Dockerfile -t vai-code-fe .
	docker build -f infra/docker/keycloak.Dockerfile -t vai-code-keycloak .
	docker build -f infra/docker/proxy.Dockerfile -t vai-code-proxy .

format:
	uv run --project be ruff format be/src be/tests
	uv run --project worker ruff format worker/src worker/tests
	uv run --project ai ruff format ai/src ai/tests
	pnpm --dir fe exec prettier --write src

migrate:
	uv run --project be alembic -c be/alembic.ini upgrade head

generate-contracts:
	@mkdir -p fe/src/shared/api
	uv run --project be python scripts/export_openapi.py
	pnpm --dir fe exec openapi-typescript src/shared/api/openapi.json -o src/shared/api/generated.ts
