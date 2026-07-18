#!/usr/bin/env bash
# Pull-based deployment agent for micace-server.
# GitHub Actions publishes immutable GHCR images; this script runs on the K3s
# node, polls the configured branch, waits until all four images exist, then
# applies the matching Kustomize overlay and records the deployed commit SHA.

set -euo pipefail

ENVIRONMENT="${1:-}"
case "$ENVIRONMENT" in
  dev|prod) ;;
  *) echo "usage: $0 <dev|prod>" >&2; exit 2 ;;
esac

CONFIG_DIR="${CONFIG_DIR:-/etc/weatherbridge}"
STATE_DIR="${STATE_DIR:-/var/lib/weatherbridge-deploy}"
REPO_DIR="${REPO_DIR:-/opt/weatherbridge/repo}"

[ -f "$CONFIG_DIR/$ENVIRONMENT.env" ] || {
  echo "missing $CONFIG_DIR/$ENVIRONMENT.env" >&2
  exit 2
}

set -a
[ ! -f "$CONFIG_DIR/common.env" ] || . "$CONFIG_DIR/common.env"
. "$CONFIG_DIR/$ENVIRONMENT.env"
set +a

if [ "${DEPLOY_ENABLED:-false}" != "true" ]; then
  echo "pull deploy for $ENVIRONMENT is disabled (DEPLOY_ENABLED != true)"
  exit 0
fi

for command_name in git docker kubectl kustomize curl flock; do
  command -v "$command_name" >/dev/null || {
    echo "required command not found: $command_name" >&2
    exit 2
  }
done

REPO_URL="${REPO_URL:-https://github.com/anhtrinh2905/weatherbridge_ai.git}"
REPO_OWNER="${REPO_OWNER:-anhtrinh2905}"
REGISTRY="${REGISTRY:-ghcr.io}"

case "$ENVIRONMENT" in
  dev)
    BRANCH="${BRANCH:-dev}"
    OVERLAY="${OVERLAY:-dev}"
    NAMESPACE="${NAMESPACE:-weather-bridge-dev}"
    ROOT_HOST="${ROOT_HOST:-dev.weatherbridge.online}"
    AUTH_HOST="${AUTH_HOST:-dev-auth.weatherbridge.online}"
    ;;
  prod)
    BRANCH="${BRANCH:-main}"
    OVERLAY="${OVERLAY:-dienbien}"
    NAMESPACE="${NAMESPACE:-weather-bridge-prod}"
    ROOT_HOST="${ROOT_HOST:-dienbien.weatherbridge.online}"
    AUTH_HOST="${AUTH_HOST:-dienbien-auth.weatherbridge.online}"
    ;;
esac

mkdir -p "$STATE_DIR" "$(dirname "$REPO_DIR")" /run/lock
exec 9>"/run/lock/weatherbridge-deploy-$ENVIRONMENT.lock"
if ! flock -n 9; then
  echo "another $ENVIRONMENT deployment is already running"
  exit 0
fi

WORK_DIR="$(mktemp -d)"
DOCKER_CONFIG_DIR="$(mktemp -d)"
MANIFEST="$WORK_DIR/rendered.yaml"
cleanup() {
  rm -rf "$WORK_DIR" "$DOCKER_CONFIG_DIR"
}
diagnostics() {
  echo "deployment failed; collecting diagnostics" >&2
  kubectl -n "$NAMESPACE" get pods,deploy,statefulset,job,ingress >&2 || true
  kubectl -n "$NAMESPACE" get events --sort-by=.lastTimestamp 2>/dev/null | tail -40 >&2 || true
}
trap cleanup EXIT
trap diagnostics ERR

if [ ! -d "$REPO_DIR/.git" ]; then
  git clone --filter=blob:none --no-checkout "$REPO_URL" "$REPO_DIR"
fi
git -C "$REPO_DIR" remote set-url origin "$REPO_URL"
git -C "$REPO_DIR" fetch --prune origin "+refs/heads/$BRANCH:refs/remotes/origin/$BRANCH"

if [ -z "${TARGET_SHA:-}" ]; then
  TARGET_SHA="$(git -C "$REPO_DIR" rev-parse "origin/$BRANCH")"
fi
if ! [[ "$TARGET_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "invalid target SHA: $TARGET_SHA" >&2
  exit 2
fi

STATE_FILE="$STATE_DIR/$ENVIRONMENT.sha"
CURRENT_SHA="$(cat "$STATE_FILE" 2>/dev/null || true)"
if [ "$TARGET_SHA" = "$CURRENT_SHA" ] && [ "${FORCE_DEPLOY:-false}" != "true" ]; then
  echo "$ENVIRONMENT already runs $TARGET_SHA"
  exit 0
fi

git -C "$REPO_DIR" checkout --detach --force "$TARGET_SHA"

export DOCKER_CONFIG="$DOCKER_CONFIG_DIR"
if [ -n "${GHCR_USER:-}" ] && [ -n "${GHCR_TOKEN:-}" ]; then
  printf '%s' "$GHCR_TOKEN" | docker login "$REGISTRY" --username "$GHCR_USER" --password-stdin >/dev/null
fi

IMAGE_BE="$REGISTRY/$REPO_OWNER/weather-bridge-be:$TARGET_SHA"
IMAGE_WORKER="$REGISTRY/$REPO_OWNER/weather-bridge-worker:$TARGET_SHA"
IMAGE_FE="$REGISTRY/$REPO_OWNER/weather-bridge-fe:$TARGET_SHA"
IMAGE_KEYCLOAK="$REGISTRY/$REPO_OWNER/weather-bridge-keycloak:$TARGET_SHA"

for image in "$IMAGE_BE" "$IMAGE_WORKER" "$IMAGE_FE" "$IMAGE_KEYCLOAK"; do
  if ! docker manifest inspect "$image" >/dev/null 2>&1; then
    echo "images for $TARGET_SHA are not ready yet; missing $image"
    exit 0
  fi
done

cp -a "$REPO_DIR/infra/k8s" "$WORK_DIR/k8s"
(
  cd "$WORK_DIR/k8s/overlays/$OVERLAY"
  kustomize edit set image \
    weather-bridge/be="$IMAGE_BE" \
    weather-bridge/worker="$IMAGE_WORKER" \
    weather-bridge/fe="$IMAGE_FE" \
    weather-bridge/keycloak="$IMAGE_KEYCLOAK"
  kustomize build . > "$MANIFEST"
)

if grep -Eq 'REPLACE_OWNER|:placeholder' "$MANIFEST"; then
  echo "rendered manifest contains placeholder image references" >&2
  exit 1
fi

kubectl get namespace "$NAMESPACE" >/dev/null 2>&1 || kubectl create namespace "$NAMESPACE"
for required_secret in app-secret db-secret keycloak-secret; do
  kubectl -n "$NAMESPACE" get secret "$required_secret" >/dev/null 2>&1 || {
    echo "missing Kubernetes Secret $NAMESPACE/$required_secret" >&2
    exit 1
  }
done

if [ -n "${GHCR_USER:-}" ] && [ -n "${GHCR_TOKEN:-}" ]; then
  kubectl -n "$NAMESPACE" create secret docker-registry ghcr-pull \
    --docker-server="$REGISTRY" \
    --docker-username="$GHCR_USER" \
    --docker-password="$GHCR_TOKEN" \
    --dry-run=client -o yaml | kubectl apply -f -
  kubectl -n "$NAMESPACE" patch serviceaccount default --type=merge \
    -p '{"imagePullSecrets":[{"name":"ghcr-pull"}]}' >/dev/null
fi

echo "deploying $ENVIRONMENT commit $TARGET_SHA"
APPLY_OUT="$(kubectl apply -f "$MANIFEST" 2>&1)"

rollout_if_changed() {
  local resource="$1"; local timeout="$2"
  if echo "$APPLY_OUT" | grep -qE "$resource.*configured|$resource.*created"; then
    kubectl -n "$NAMESPACE" rollout status "$resource" --timeout="${timeout}s"
  else
    echo "$resource unchanged, skipping rollout wait"
  fi
}

rollout_if_changed statefulset/db 600
rollout_if_changed statefulset/keycloak-db 600
rollout_if_changed deploy/redis 300
rollout_if_changed deploy/be 600
rollout_if_changed deploy/fe 300
rollout_if_changed deploy/keycloak 600
rollout_if_changed deploy/worker 600

ROOT_URL="https://$ROOT_HOST"
AUTH_URL="https://$AUTH_HOST"
curl --retry 6 --retry-all-errors --retry-delay 5 -fsS --max-time 30 \
  "$ROOT_URL/api/v1/health/live" | grep -q '"status":"ok"'
curl --retry 6 --retry-all-errors --retry-delay 5 -fsS --max-time 30 \
  "$ROOT_URL/api/v1/health/ready" | grep -q '"status":"ready"'
curl --retry 6 --retry-all-errors --retry-delay 5 -fsS --max-time 30 \
  "$ROOT_URL/" | grep -q 'Weather Bridge AI'
ISSUER="$(curl --retry 6 --retry-all-errors --retry-delay 5 -fsS --max-time 30 \
  "$AUTH_URL/realms/weather-bridge/.well-known/openid-configuration" \
  | jq -r .issuer)"
test "$ISSUER" = "$AUTH_URL/realms/weather-bridge"

# Code deployment and research-data synchronization are separate operations.
# The PostgreSQL PVC is authoritative; this idempotent step preserves it while
# applying the catalog seed and failing the rollout if real training data is
# unexpectedly absent. Full Open-Meteo collection is explicit, never automatic.
RESEARCH_DB_SYNC_TARGET=k8s \
RESEARCH_DB_SYNC_NAMESPACE="$NAMESPACE" \
RESEARCH_DB_REQUIRE_DATA="${RESEARCH_DB_REQUIRE_DATA:-true}" \
  "$REPO_DIR/scripts/sync-research-database.sh" --target k8s --namespace "$NAMESPACE"

printf '%s\n' "$TARGET_SHA" > "$STATE_FILE.tmp"
mv "$STATE_FILE.tmp" "$STATE_FILE"
trap - ERR
echo "deployed $ENVIRONMENT commit $TARGET_SHA successfully"
