#!/usr/bin/env bash
# Deploy the `dev` overlay to the local K3s cluster on micace-server without
# going through GitHub Actions. Use this for the first dev deploy or when
# GitHub Environments are not yet configured.
#
# Prerequisites on the server:
#   - kubectl configured and pointing at K3s (`kubectl get nodes` works)
#   - docker (or buildah/podman) for the `local` source
#   - kustomize installed (`curl -s ... | bash` per the official install script)
#   - git, this repo checked out
#   - a `.env.dev` file next to this script (see .env.dev.example) with secret
#     values; the file is git-ignored and never committed.
#
# Usage (from repo root):
#   scripts/deploy-dev-local.sh                      # build local, apply
#   scripts/deploy-dev-local.sh --source local       # explicit local build
#   scripts/deploy-dev-local.sh --source ghcr --tag <sha-or-latest-dev>
#   scripts/deploy-dev-local.sh --dry-run            # render only, no apply
#
# GHCR pull (private packages): export GHCR_USER and GHCR_PAT before running,
# the script will create/update an `ghcr-pull` imagePullSecret in the namespace.

set -euo pipefail

OVERLAY_DIR="infra/k8s/overlays/dev"
NAMESPACE="weather-bridge-dev"
ENV_FILE="$(dirname "$0")/../.env.dev"
SOURCE="local"
GHCR_TAG="latest-dev"
DRY_RUN=0

usage() {
  sed -n '2,/^$/p' "$0" | sed 's/^# \{0,1\}//'
  exit 1
}

while [ $# -gt 0 ]; do
  case "$1" in
    --source) SOURCE="$2"; shift 2 ;;
    --tag)    GHCR_TAG="$2"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage ;;
    *) echo "unknown arg: $1" >&2; usage ;;
  esac
done

case "$SOURCE" in
  local|ghcr) ;;
  *) echo "--source must be 'local' or 'ghcr'" >&2; exit 2 ;;
esac

KUBECTL_BIN="$(command -v kubectl || true)"
[ -n "$KUBECTL_BIN" ] || { echo "kubectl not found" >&2; exit 2; }
if ! "$KUBECTL_BIN" get nodes >/dev/null 2>&1; then
  kubectl() { sudo "$KUBECTL_BIN" "$@"; }
fi
command -v kustomize >/dev/null || {
  echo "kustomize not found, installing to /usr/local/bin (needs sudo)..." >&2
  curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
  sudo install -m 0755 kustomize /usr/local/bin/kustomize
}
[ -d "$OVERLAY_DIR" ] || { echo "run from repo root; $OVERLAY_DIR not found" >&2; exit 2; }

# ---- secrets from .env.dev --------------------------------------------------
if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  set -a; . "$ENV_FILE"; set +a
else
  if [ "$DRY_RUN" = "0" ]; then
    echo "$ENV_FILE missing; copy .env.dev.example to .env.dev and fill values." >&2
    exit 2
  fi
fi

# ---- image refs -------------------------------------------------------------
OWNER_LOW="${OWNER_LOW:-$(git remote get-url origin 2>/dev/null | sed -E 's#.*github\.com[:/]([^/]+)/.*#\1#' | tr '[:upper:]' '[:lower:]')}"
REGISTRY="ghcr.io"

if [ "$SOURCE" = "local" ]; then
  DOCKER_BIN="$(command -v docker || true)"
  [ -n "$DOCKER_BIN" ] || { echo "docker not found (needed for --source local)" >&2; exit 2; }
  if ! "$DOCKER_BIN" info >/dev/null 2>&1; then
    docker() { sudo "$DOCKER_BIN" "$@"; }
  fi
  echo "==> Building 4 images locally (weather-bridge/*:local)"
  docker build -q -t weather-bridge/be:local      -f infra/docker/be.Dockerfile      .
  docker build -q -t weather-bridge/worker:local  -f infra/docker/worker.Dockerfile  .
  docker build -q -t weather-bridge/fe:local \
    --build-arg VITE_API_BASE_URL=/api/v1 \
    --build-arg VITE_KEYCLOAK_URL=https://dev-auth.weatherbridge.online \
    --build-arg VITE_KEYCLOAK_REALM=weather-bridge \
    --build-arg VITE_KEYCLOAK_CLIENT_ID=weather-bridge-fe \
    -f infra/docker/fe.Dockerfile .
  docker build -q -t weather-bridge/keycloak:local -f infra/docker/keycloak.Dockerfile .
  BE_IMG="weather-bridge/be:local"
  WORKER_IMG="weather-bridge/worker:local"
  FE_IMG="weather-bridge/fe:local"
  KC_IMG="weather-bridge/keycloak:local"
  # K3s uses containerd; load the built images into K3s so it can pull them.
  if command -v k3s >/dev/null 2>&1; then
    echo "==> Importing images into K3s containerd"
    for img in weather-bridge/be:local weather-bridge/worker:local weather-bridge/fe:local weather-bridge/keycloak:local; do
      image_tar="$(mktemp --suffix=.tar)"
      docker save "$img" > "$image_tar"
      sudo k3s ctr images import "$image_tar"
      rm -f "$image_tar"
    done
  else
    echo "warning: k3s CLI not found; if K3s runs elsewhere, copy images to its node." >&2
  fi
else
  echo "==> Using GHCR images tagged '$GHCR_TAG' from $OWNER_LOW"
  BE_IMG="$REGISTRY/$OWNER_LOW/weather-bridge-be:$GHCR_TAG"
  WORKER_IMG="$REGISTRY/$OWNER_LOW/weather-bridge-worker:$GHCR_TAG"
  FE_IMG="$REGISTRY/$OWNER_LOW/weather-bridge-fe:$GHCR_TAG"
  KC_IMG="$REGISTRY/$OWNER_LOW/weather-bridge-keycloak:$GHCR_TAG"
fi

# ---- render overlay ---------------------------------------------------------
echo "==> Rendering overlay dev with pinned images"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
cp -r infra/k8s "$WORK/k8s"
( cd "$WORK/k8s/overlays/dev" && \
  kustomize edit set image \
    weather-bridge/be="$BE_IMG" \
    weather-bridge/worker="$WORKER_IMG" \
    weather-bridge/fe="$FE_IMG" \
    weather-bridge/keycloak="$KC_IMG" )
kustomize build "$WORK/k8s/overlays/dev" > "$WORK/rendered.yaml"
echo "    rendered: $WORK/rendered.yaml ($(grep -c '^kind:' "$WORK/rendered.yaml") resources)"

if [ "$DRY_RUN" = "1" ]; then
  echo "==> dry-run: rendered manifest at $WORK/rendered.yaml"
  echo "    review with: less $WORK/rendered.yaml"
  echo "    (file will be removed on exit; copy it somewhere first if you want to keep it.)"
  exit 0
fi

# ---- namespace and secrets --------------------------------------------------
kubectl get namespace "$NAMESPACE" >/dev/null 2>&1 || kubectl create namespace "$NAMESPACE"

apply_secret() {
  local name="$1"; shift
  local args=()
  while [ $# -gt 0 ]; do
    local k="$1"; local v="$2"; shift 2
    [ -n "${!v:-}" ] || { echo "    warning: $v empty in $ENV_FILE — $k will be empty" >&2; }
    args+=(--from-literal="$k=${!v:-}")
  done
  kubectl -n "$NAMESPACE" create secret generic "$name" "${args[@]}" \
    --dry-run=client -o yaml | kubectl apply -f -
}

echo "==> Applying/rotating application secrets"
apply_secret app-secret \
  DATABASE_URL APP_DATABASE_URL \
  KEYCLOAK_AUDIENCE APP_KEYCLOAK_AUDIENCE \
  LITELLM_API_KEY APP_LITELLM_API_KEY \
  LITELLM_MASTER_KEY APP_LITELLM_MASTER_KEY \
  OPENAI_API_KEY APP_OPENAI_API_KEY \
  LANGFUSE_PUBLIC_KEY APP_LANGFUSE_PUBLIC_KEY \
  LANGFUSE_SECRET_KEY APP_LANGFUSE_SECRET_KEY
apply_secret db-secret \
  POSTGRES_USER DB_POSTGRES_USER \
  POSTGRES_PASSWORD DB_POSTGRES_PASSWORD \
  POSTGRES_DB DB_POSTGRES_DB
apply_secret keycloak-secret \
  KC_DB_PASSWORD KC_DB_PASSWORD \
  KC_BOOTSTRAP_ADMIN_USERNAME KC_ADMIN_USERNAME \
  KC_BOOTSTRAP_ADMIN_PASSWORD KC_ADMIN_PASSWORD

# ---- imagePullSecret for private GHCR (ghcr source only) --------------------
if [ "$SOURCE" = "ghcr" ] && [ -n "${GHCR_USER:-}" ] && [ -n "${GHCR_PAT:-}" ]; then
  echo "==> Ensuring ghcr-pull imagePullSecret"
  kubectl -n "$NAMESPACE" create secret docker-registry ghcr-pull \
    --docker-server="$REGISTRY" \
    --docker-username="$GHCR_USER" \
    --docker-password="$GHCR_PAT" \
    --dry-run=client -o yaml | kubectl apply -f -
  kubectl -n "$NAMESPACE" patch serviceaccount default --type=merge \
    -p '{"imagePullSecrets":[{"name":"ghcr-pull"}]}'
fi

# ---- apply ------------------------------------------------------------------
echo "==> kubectl apply -f rendered.yaml (namespace $NAMESPACE)"
kubectl apply -f "$WORK/rendered.yaml" --namespace "$NAMESPACE"
kubectl -n "$NAMESPACE" rollout restart deploy/be deploy/worker deploy/keycloak deploy/fe

# ---- rollout ----------------------------------------------------------------
echo "==> Waiting for rollouts"
kubectl -n "$NAMESPACE" rollout status deploy/be      --timeout=300s
kubectl -n "$NAMESPACE" rollout status deploy/fe      --timeout=180s
kubectl -n "$NAMESPACE" rollout status deploy/keycloak --timeout=300s
kubectl -n "$NAMESPACE" rollout status deploy/worker  --timeout=180s

# ---- smoke ------------------------------------------------------------------
echo "==> Smoke check"
URL="https://dev.weatherbridge.online/api/v1/health/live"
if curl -fsS --max-time 30 "$URL" | grep -q '"status":"ok"'; then
  echo "smoke ok: $URL"
else
  echo "smoke FAILED: $URL did not return ok" >&2
  echo "  check: kubectl -n $NAMESPACE get pods" >&2
  echo "  logs:  kubectl -n $NAMESPACE logs deploy/be" >&2
  exit 1
fi
