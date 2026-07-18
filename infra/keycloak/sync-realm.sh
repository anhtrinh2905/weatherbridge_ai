#!/usr/bin/env bash

set -Eeuo pipefail

KCADM="/opt/keycloak/bin/kcadm.sh"
PROFILE_FILE="/opt/keycloak/data/migrations/weather-bridge-user-profile.json"
SERVER="${KEYCLOAK_SYNC_SERVER:-http://127.0.0.1:${KC_HTTP_PORT:-8080}}"
REALM="${KEYCLOAK_SYNC_REALM:-weather-bridge}"
TARGET_VERSION=1

ADMIN_USERNAME="${KC_BOOTSTRAP_ADMIN_USERNAME:?KC_BOOTSTRAP_ADMIN_USERNAME is required}"
ADMIN_PASSWORD="${KC_BOOTSTRAP_ADMIN_PASSWORD:?KC_BOOTSTRAP_ADMIN_PASSWORD is required}"

log() {
  printf '[keycloak-sync] %s\n' "$*"
}

authenticate() {
  local attempt=1
  while [ "$attempt" -le 60 ]; do
    if "$KCADM" config credentials \
      --server "$SERVER" \
      --realm master \
      --user "$ADMIN_USERNAME" \
      --password "$ADMIN_PASSWORD" >/tmp/weather-bridge-kcadm-login.log 2>&1; then
      return 0
    fi
    sleep 5
    attempt=$((attempt + 1))
  done

  cat /tmp/weather-bridge-kcadm-login.log >&2
  log "could not authenticate to Keycloak at $SERVER" >&2
  return 1
}

wait_for_realm() {
  local attempt=1
  while [ "$attempt" -le 30 ]; do
    if "$KCADM" get "realms/$REALM" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
    attempt=$((attempt + 1))
  done

  log "realm $REALM did not become available" >&2
  return 1
}

upsert_role() {
  local name="$1"
  local description="$2"

  if "$KCADM" get "roles/$name" -r "$REALM" >/dev/null 2>&1; then
    "$KCADM" update "roles/$name" -r "$REALM" \
      -s "name=$name" \
      -s "description=$description" >/dev/null
  else
    "$KCADM" create roles -r "$REALM" \
      -s "name=$name" \
      -s "description=$description" >/dev/null
  fi
}

find_mapper_id() {
  local client_id="$1"
  local row mapper_id mapper_name

  while IFS= read -r row; do
    IFS=, read -r mapper_id mapper_name <<< "$row"
    if [ "$mapper_name" = "village_id" ]; then
      printf '%s' "$mapper_id"
      return 0
    fi
  done < <(
    "$KCADM" get "clients/$client_id/protocol-mappers/models" \
      -r "$REALM" \
      --fields id,name \
      --format csv \
      --noquotes
  )
}

upsert_village_mapper() {
  local client_id="$1"
  local mapper_id

  mapper_id="$(find_mapper_id "$client_id")"
  if [ -z "$mapper_id" ]; then
    mapper_id="$(
      "$KCADM" create "clients/$client_id/protocol-mappers/models" \
        -r "$REALM" \
        -i \
        -s name=village_id \
        -s protocol=openid-connect \
        -s protocolMapper=oidc-usermodel-attribute-mapper \
        -s consentRequired=false
    )"
  fi

  "$KCADM" update "clients/$client_id/protocol-mappers/models/$mapper_id" \
    -r "$REALM" \
    -s name=village_id \
    -s protocol=openid-connect \
    -s protocolMapper=oidc-usermodel-attribute-mapper \
    -s consentRequired=false \
    -s 'config."user.attribute"=village_id' \
    -s 'config."claim.name"=village_id' \
    -s 'config."jsonType.label"=String' \
    -s 'config."id.token.claim"=true' \
    -s 'config."access.token.claim"=true' \
    -s 'config."userinfo.token.claim"=true' \
    -s 'config."multivalued"=false' >/dev/null
}

upsert_demo_user() {
  local username="$1"
  local first_name="$2"
  local last_name="$3"
  local role="$4"
  local village_id="${5:-}"
  local user_id
  local update_args

  user_id="$(
    "$KCADM" get users \
      -r "$REALM" \
      -q exact=true \
      -q "username=$username" \
      --fields id \
      --format csv \
      --noquotes
  )"

  if [ -z "$user_id" ]; then
    user_id="$(
      "$KCADM" create users \
        -r "$REALM" \
        -i \
        -s "username=$username" \
        -s "email=$username" \
        -s enabled=true \
        -s emailVerified=true \
        -s "firstName=$first_name" \
        -s "lastName=$last_name"
    )"
  fi

  update_args=(
    -s "username=$username"
    -s "email=$username"
    -s enabled=true
    -s emailVerified=true
    -s "firstName=$first_name"
    -s "lastName=$last_name"
  )
  if [ -n "$village_id" ]; then
    update_args+=(-s "attributes.village_id=[\"$village_id\"]")
  fi

  "$KCADM" update "users/$user_id" -r "$REALM" "${update_args[@]}" >/dev/null
  "$KCADM" set-password \
    -r "$REALM" \
    --username "$username" \
    --new-password 'Demo@12345' >/dev/null
  "$KCADM" add-roles \
    -r "$REALM" \
    --uusername "$username" \
    --rolename user \
    --rolename "$role" >/dev/null
}

log "waiting for Keycloak"
authenticate
wait_for_realm

current_version="$(
  "$KCADM" get "realms/$REALM" \
    --fields 'attributes(weatherBridgeMigrationVersion)' \
    --format csv \
    --noquotes
)"
if [ -z "$current_version" ] || [ "$current_version" = "null" ]; then
  current_version=0
fi
if ! [[ "$current_version" =~ ^[0-9]+$ ]]; then
  log "invalid weatherBridgeMigrationVersion: $current_version" >&2
  exit 1
fi

if [ "$current_version" -lt "$TARGET_VERSION" ]; then
  log "applying realm migration $current_version -> $TARGET_VERSION"
  "$KCADM" update users/profile -r "$REALM" -f "$PROFILE_FILE" >/dev/null
fi

upsert_role user "Default application user (no dashboard access until an admin assigns one of the 4 domain roles)"
upsert_role admin "Van hanh he thong, cau hinh nguong, kiem dinh mo hinh"
upsert_role commune_officer "Can bo PCTT xa - xem heatmap toan xa, ra quyet dinh canh bao"
upsert_role village_head "Truong thon/ban - xem va xac nhan cho ban minh"
upsert_role resident "Nguoi dan - xem the canh bao va tu xac nhan an toan"

client_id="$(
  "$KCADM" get clients \
    -r "$REALM" \
    -q clientId=weather-bridge-fe \
    --fields id \
    --format csv \
    --noquotes
)"
if [ -z "$client_id" ] || [[ "$client_id" == *$'\n'* ]]; then
  log "expected exactly one weather-bridge-fe client" >&2
  exit 1
fi

"$KCADM" update "clients/$client_id" -r "$REALM" \
  -s standardFlowEnabled=true \
  -s implicitFlowEnabled=false \
  -s directAccessGrantsEnabled=true \
  -s serviceAccountsEnabled=false \
  -s 'redirectUris=["http://localhost/*","http://localhost:5173/*","https://dev.weatherbridge.online/*","https://dienbien.weatherbridge.online/*"]' \
  -s 'webOrigins=["http://localhost","http://localhost:5173","https://dev.weatherbridge.online","https://dienbien.weatherbridge.online"]' \
  -s 'attributes."pkce.code.challenge.method"=S256' \
  -s 'attributes."post.logout.redirect.uris"=http://localhost/*##http://localhost:5173/*##https://dev.weatherbridge.online/*##https://dienbien.weatherbridge.online/*' >/dev/null

upsert_village_mapper "$client_id"
upsert_demo_user admin@weather-bridge.local Admin Demo admin
upsert_demo_user canbo@weather-bridge.local "Can Bo" "PCTT Demo" commune_officer
upsert_demo_user truongban@weather-bridge.local "Truong Ban" "Muong Pon 1 Demo" village_head muong-pon-1
upsert_demo_user dan@weather-bridge.local "Nguoi Dan" Demo resident muong-pon-1

if [ "$current_version" -lt "$TARGET_VERSION" ]; then
  "$KCADM" update "realms/$REALM" \
    -s "attributes.weatherBridgeMigrationVersion=$TARGET_VERSION" >/dev/null
fi

direct_grants="$(
  "$KCADM" get "clients/$client_id" \
    -r "$REALM" \
    --fields directAccessGrantsEnabled \
    --format csv \
    --noquotes
)"
if [ "$direct_grants" != "true" ]; then
  log "weather-bridge-fe direct access grants are not enabled" >&2
  exit 1
fi

log "realm $REALM is synchronized at migration version $TARGET_VERSION"
