.PHONY: install dev dev-infra dev-ai ai-prepare ai-train ai-evaluate api worker hazard-seed hazard-catalog-csv weather-backfill weather-quality training-csv research-db-sync research-db-collect research-db-backup check test build format migrate generate-contracts k8s-render-prod k8s-render-dev k8s-apply-prod k8s-apply-dev deploy-k3s

install:
	uv sync --project be --extra speech
	uv sync --project worker
	uv sync --project ai
	pnpm install

dev-infra:
	docker compose up -d db redis mailpit keycloak

dev:
	docker compose up -d

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
	uv run --project be --extra speech uvicorn --app-dir be/src main:app --reload --host 0.0.0.0 --port 8000

worker:
	PYTHONPATH=worker/src:be/src uv run --project worker python worker/src/main.py

hazard-seed:
	PYTHONPATH=worker/src:be/src uv run --project worker python worker/src/backfill_cli.py seed

hazard-catalog-csv:
	PYTHONPATH=worker/src:be/src uv run --project worker python worker/src/backfill_cli.py catalog-csv

weather-backfill:
	PYTHONPATH=worker/src:be/src uv run --project worker python worker/src/backfill_cli.py backfill --continue-on-error

weather-quality:
	PYTHONPATH=worker/src:be/src uv run --project worker python worker/src/backfill_cli.py quality

training-csv:
	PYTHONPATH=worker/src:be/src uv run --project worker python worker/src/backfill_cli.py export-csv

research-db-sync:
	scripts/sync-research-database.sh --target local

research-db-collect:
	scripts/sync-research-database.sh --target local --collect --export

research-db-backup:
	scripts/backup-research-database.sh --target local

check:
	pnpm --dir fe lint
	pnpm --dir fe typecheck
	uv run --project be --extra speech ruff check be/src be/tests
	uv run --project be --extra speech mypy be/src
	uv run --project worker ruff check worker/src worker/tests
	uv run --project ai ruff check ai/src ai/tests

test:
	pnpm --dir fe test
	uv run --project be --extra speech pytest be/tests
	uv run --project worker pytest worker/tests
	uv run --project ai pytest ai/tests

build:
	pnpm --dir fe build
	docker build -f infra/docker/be.Dockerfile -t weather-bridge-be .
	docker build -f infra/docker/worker.Dockerfile -t weather-bridge-worker .
	docker build -f infra/docker/fe.Dockerfile -t weather-bridge-fe .
	docker build -f infra/docker/keycloak.Dockerfile -t weather-bridge-keycloak .
	docker build -f infra/docker/proxy.Dockerfile -t weather-bridge-proxy .

format:
	uv run --project be --extra speech ruff format be/src be/tests
	uv run --project worker ruff format worker/src worker/tests
	uv run --project ai ruff format ai/src ai/tests
	pnpm --dir fe exec prettier --write src

migrate:
	uv run --project be --extra speech alembic -c be/alembic.ini upgrade head

generate-contracts:
	@mkdir -p fe/src/shared/api
	uv run --project be --extra speech python scripts/export_openapi.py
	pnpm --dir fe exec openapi-typescript src/shared/api/openapi.json -o src/shared/api/generated.ts

k8s-render-prod:
	kustomize build infra/k8s/overlays/dienbien > /tmp/wb-prod.yaml
	@echo "Rendered prod to /tmp/wb-prod.yaml"

k8s-render-dev:
	kustomize build infra/k8s/overlays/dev > /tmp/wb-dev.yaml
	@echo "Rendered dev to /tmp/wb-dev.yaml"

k8s-apply-prod:
	kustomize build infra/k8s/overlays/dienbien | kubectl apply -f -
	kubectl -n weather-bridge-prod rollout status deploy/be --timeout=300s
	kubectl -n weather-bridge-prod rollout status deploy/fe --timeout=180s
	kubectl -n weather-bridge-prod rollout status deploy/keycloak --timeout=300s
	kubectl -n weather-bridge-prod rollout status deploy/worker --timeout=180s

k8s-apply-dev:
	kustomize build infra/k8s/overlays/dev | kubectl apply -f -
	kubectl -n weather-bridge-dev rollout status deploy/be --timeout=300s
	kubectl -n weather-bridge-dev rollout status deploy/fe --timeout=180s
	kubectl -n weather-bridge-dev rollout status deploy/keycloak --timeout=300s
	kubectl -n weather-bridge-dev rollout status deploy/worker --timeout=180s

deploy-k3s:
	@echo "CI/CD: push to main (prod) or dev (dev), or run the Deploy workflow manually."
	@echo "See infra/k8s/README.md for required GitHub secrets and environments."
