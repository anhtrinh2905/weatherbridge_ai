#!/usr/bin/env bash
# Synchronize the research catalog and verify persisted weather data after a deploy.
# The command is intentionally idempotent. It never drops tables or deletes rows.
#
# Local:
#   scripts/sync-research-database.sh --target local
# Kubernetes:
#   scripts/sync-research-database.sh --target k8s --namespace weather-bridge-prod
#
# Add --collect only for an intentional Open-Meteo backfill. A normal merge sync
# only migrates, seeds, and verifies the existing PostgreSQL/PVC data.

set -euo pipefail

TARGET="${RESEARCH_DB_SYNC_TARGET:-local}"
NAMESPACE="${RESEARCH_DB_SYNC_NAMESPACE:-weather-bridge-prod}"
REQUIRE_DATA="${RESEARCH_DB_REQUIRE_DATA:-true}"
COLLECT="false"
EXPORT="false"
DRY_RUN="false"
START_DATE="${RESEARCH_DB_START_DATE:-2021-03-23}"
END_DATE="${RESEARCH_DB_END_DATE:-$(date -u +%F)}"
PRODUCTS="${RESEARCH_DB_PRODUCTS:-historical_forecast previous_runs archive}"

usage() {
  sed -n '2,/^$/p' "$0" | sed 's/^# \{0,1\}//'
  exit 1
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --target) TARGET="$2"; shift 2 ;;
    --namespace) NAMESPACE="$2"; shift 2 ;;
    --collect) COLLECT="true"; shift ;;
    --export) EXPORT="true"; shift ;;
    --start-date) START_DATE="$2"; shift 2 ;;
    --end-date) END_DATE="$2"; shift 2 ;;
    --products) PRODUCTS="$2"; shift 2 ;;
    --require-data) REQUIRE_DATA="true"; shift ;;
    --allow-empty) REQUIRE_DATA="false"; shift ;;
    --dry-run) DRY_RUN="true"; shift ;;
    -h|--help) usage ;;
    *) echo "unknown argument: $1" >&2; usage ;;
  esac
done

case "$TARGET" in
  local|k8s) ;;
  *) echo "--target must be local or k8s" >&2; exit 2 ;;
esac

SYNC_ARGS=(sync)
[ "$REQUIRE_DATA" = "true" ] && SYNC_ARGS+=(--require-training-data)
[ "$COLLECT" = "true" ] && SYNC_ARGS+=(--collect --start-date "$START_DATE" --end-date "$END_DATE" --products $PRODUCTS)
[ "$EXPORT" = "true" ] && SYNC_ARGS+=(--export)

printf 'research database sync target=%s collect=%s export=%s require_data=%s\n' \
  "$TARGET" "$COLLECT" "$EXPORT" "$REQUIRE_DATA"
printf 'command:'
printf ' %q' "${SYNC_ARGS[@]}"
printf '\n'

if [ "$DRY_RUN" = "true" ]; then
  exit 0
fi

if [ "$TARGET" = "local" ]; then
  command -v docker >/dev/null || { echo "docker is required" >&2; exit 2; }
else
  command -v kubectl >/dev/null || { echo "kubectl is required" >&2; exit 2; }
fi

if [ "$TARGET" = "local" ]; then
  docker compose up -d db
  until docker compose exec -T db pg_isready -U "${POSTGRES_USER:-vai}" \
      -d "${POSTGRES_DB:-weather_bridge}" >/dev/null 2>&1; do
    sleep 2
  done
  docker compose run --rm migrate
  docker compose run --rm --no-deps worker \
    uv run --project /app/worker --no-dev python /app/worker/src/backfill_cli.py "${SYNC_ARGS[@]}"
else
  kubectl -n "$NAMESPACE" rollout status deploy/worker --timeout=600s
  kubectl -n "$NAMESPACE" exec deploy/worker -- \
    uv run --project /app/worker --no-dev python /app/worker/src/backfill_cli.py "${SYNC_ARGS[@]}"
fi

echo "research database sync completed"
