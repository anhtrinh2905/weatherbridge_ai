#!/usr/bin/env bash
# Install the pull-based deployment agent on micace-server.

set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "run with sudo: sudo scripts/install-pull-cd.sh [--enable-dev]" >&2
  exit 2
fi

ENABLE_DEV=false
if [ "${1:-}" = "--enable-dev" ]; then
  ENABLE_DEV=true
elif [ $# -gt 0 ]; then
  echo "unknown argument: $1" >&2
  exit 2
fi

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
install -d -m 0755 /usr/local/libexec/weatherbridge /etc/weatherbridge \
  /opt/weatherbridge /var/lib/weatherbridge-deploy
install -m 0755 "$ROOT_DIR/scripts/pull-deploy.sh" \
  /usr/local/libexec/weatherbridge/pull-deploy
install -m 0644 "$ROOT_DIR/infra/systemd/weatherbridge-deploy@.service" \
  /etc/systemd/system/weatherbridge-deploy@.service
install -m 0644 "$ROOT_DIR/infra/systemd/weatherbridge-deploy@.timer" \
  /etc/systemd/system/weatherbridge-deploy@.timer

if [ ! -f /etc/weatherbridge/common.env ]; then
  cat > /etc/weatherbridge/common.env <<'EOF'
REPO_URL=https://github.com/anhtrinh2905/weatherbridge_ai.git
REPO_OWNER=anhtrinh2905
REGISTRY=ghcr.io
# Set these only if GHCR packages remain private. Use a token with read:packages.
GHCR_USER=
GHCR_TOKEN=
EOF
fi

if [ ! -f /etc/weatherbridge/dev.env ]; then
  cat > /etc/weatherbridge/dev.env <<'EOF'
# Change to true only after the pull agent workflow is present on branch dev
# and all four GHCR packages are readable by this server.
DEPLOY_ENABLED=false
BRANCH=dev
OVERLAY=dev
NAMESPACE=weather-bridge-dev
ROOT_HOST=dev.weatherbridge.online
AUTH_HOST=dev-auth.weatherbridge.online
EOF
fi

if [ ! -f /etc/weatherbridge/prod.env ]; then
  cat > /etc/weatherbridge/prod.env <<'EOF'
# Production is intentionally manual: keep its timer disabled and start
# weatherbridge-deploy@prod.service only after setting DEPLOY_ENABLED=true.
DEPLOY_ENABLED=false
BRANCH=main
OVERLAY=dienbien
NAMESPACE=weather-bridge-prod
ROOT_HOST=dienbien.weatherbridge.online
AUTH_HOST=dienbien-auth.weatherbridge.online
EOF
fi

chown root:root /etc/weatherbridge/*.env
chmod 0600 /etc/weatherbridge/*.env
systemctl daemon-reload

if [ "$ENABLE_DEV" = "true" ]; then
  systemctl enable --now weatherbridge-deploy@dev.timer
fi

echo "pull-based CD installed"
echo "edit /etc/weatherbridge/common.env and dev.env, then set DEPLOY_ENABLED=true"
echo "dev timer: systemctl status weatherbridge-deploy@dev.timer"
echo "prod deploy: systemctl start weatherbridge-deploy@prod.service"
