#!/usr/bin/env bash
# Create a PostgreSQL custom-format backup of the app/research database.
# The backup contains real collected data and must stay outside Git.

set -euo pipefail

TARGET="${RESEARCH_DB_BACKUP_TARGET:-local}"
NAMESPACE="${RESEARCH_DB_BACKUP_NAMESPACE:-weather-bridge-prod}"
OUTPUT_DIR="${RESEARCH_DB_BACKUP_DIR:-data/backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUTPUT="$OUTPUT_DIR/weatherbridge-research-$STAMP.dump"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --target) TARGET="$2"; shift 2 ;;
    --namespace) NAMESPACE="$2"; shift 2 ;;
    --output-dir) OUTPUT_DIR="$2"; OUTPUT="$OUTPUT_DIR/weatherbridge-research-$STAMP.dump"; shift 2 ;;
    -h|--help)
      printf 'usage: %s [--target local|k8s] [--namespace NAME] [--output-dir DIR]\n' "$0"
      exit 0
      ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

case "$TARGET" in
  local) command -v docker >/dev/null || { echo "docker is required" >&2; exit 2; } ;;
  k8s) command -v kubectl >/dev/null || { echo "kubectl is required" >&2; exit 2; } ;;
  *) echo "--target must be local or k8s" >&2; exit 2 ;;
esac

mkdir -p "$OUTPUT_DIR"
if [ "$TARGET" = "local" ]; then
  docker compose exec -T db sh -c \
    'pg_dump --format=custom --no-owner --no-acl -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
    > "$OUTPUT"
else
  kubectl -n "$NAMESPACE" exec statefulset/db -- sh -c \
    'pg_dump --format=custom --no-owner --no-acl -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
    > "$OUTPUT"
fi

test -s "$OUTPUT"
