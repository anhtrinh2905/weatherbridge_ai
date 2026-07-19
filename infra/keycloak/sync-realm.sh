#!/usr/bin/env bash
set -Eeuo pipefail

KCADM="/opt/keycloak/bin/kcadm.sh"
PROFILE_FILE="/opt/keycloak/data/migrations/weather-bridge-user-profile.json"
SERVER="${KEYCLOAK_SYNC_SERVER:-http://127.0.0.1:${KC_HTTP_PORT:-8080}}"
REALM="${KEYCLOAK_SYNC_REALM:-weather-bridge}"
TARGET_VERSION=1

ADMIN_USERNAME="${KC_BOOTSTRAP_ADMIN_USERNAME:?KC_BOOTSTRAP_ADMIN_USERNAME is required}"
ADMIN_PASSWORD="${KC_BOOTSTRAP_ADMIN_PASSWORD:?KC_BOOTSTRAP_ADMIN_PASSWORD is required}"

log() { printf '[keycloak-sync] %s\n' "$*"; }

authenticate() {
  local attempt=1
  while [ "$attempt" -le 60 ]; do
    if "$KCADM" config credentials --server "$SERVER" --realm master --user "$ADMIN_USERNAME" --password "$ADMIN_PASSWORD" >/tmp/kcadm-login.log 2>&1; then
      return 0
    fi
    sleep 5; attempt=$((attempt + 1))
  done
  cat /tmp/kcadm-login.log >&2
  log "could not authenticate to Keycloak at $SERVER" >&2; return 1
}

wait_for_realm() {
  local attempt=1
  while [ "$attempt" -le 30 ]; do
    "$KCADM" get "realms/$REALM" >/dev/null 2>&1 && return 0
    sleep 2; attempt=$((attempt + 1))
  done
  log "realm $REALM did not become available" >&2; return 1
}

upsert_role() {
  local name="$1" desc="$2"
  if "$KCADM" get "roles/$name" -r "$REALM" >/dev/null 2>&1; then
    "$KCADM" update "roles/$name" -r "$REALM" -s "name=$name" -s "description=$desc" >/dev/null
  else
    "$KCADM" create roles -r "$REALM" -s "name=$name" -s "description=$desc" >/dev/null
  fi
}

find_mapper_id() {
  local client_id="$1" target_name="$2" row mapper_id mapper_name
  while IFS= read -r row; do
    IFS=, read -r mapper_id mapper_name <<< "$row"
    [ "$mapper_name" = "$target_name" ] && { printf '%s' "$mapper_id"; return 0; }
  done < <("$KCADM" get "clients/$client_id/protocol-mappers/models" -r "$REALM" --fields id,name --format csv --noquotes)
  return 0
}

upsert_village_mapper() {
  local client_id="$1" mapper_id
  mapper_id="$(find_mapper_id "$client_id" village_id)"
  if [ -z "$mapper_id" ]; then
    mapper_id="$("$KCADM" create "clients/$client_id/protocol-mappers/models" -r "$REALM" -i \
      -s name=village_id -s protocol=openid-connect \
      -s protocolMapper=oidc-usermodel-attribute-mapper -s consentRequired=false)"
  fi
  "$KCADM" update "clients/$client_id/protocol-mappers/models/$mapper_id" -r "$REALM" \
    -s name=village_id -s protocol=openid-connect \
    -s protocolMapper=oidc-usermodel-attribute-mapper -s consentRequired=false \
    -s 'config."user.attribute"=village_id' -s 'config."claim.name"=village_id' \
    -s 'config."jsonType.label"=String' -s 'config."id.token.claim"=true' \
    -s 'config."access.token.claim"=true' -s 'config."userinfo.token.claim"=true' \
    -s 'config."multivalued"=false' >/dev/null
}

upsert_frontend_audience_mapper() {
  local client_id="$1" mapper_id
  mapper_id="$(find_mapper_id "$client_id" weather-bridge-fe-audience)"
  if [ -z "$mapper_id" ]; then
    mapper_id="$("$KCADM" create "clients/$client_id/protocol-mappers/models" -r "$REALM" -i \
      -s name=weather-bridge-fe-audience -s protocol=openid-connect \
      -s protocolMapper=oidc-audience-mapper -s consentRequired=false)"
  fi
  "$KCADM" update "clients/$client_id/protocol-mappers/models/$mapper_id" -r "$REALM" \
    -s name=weather-bridge-fe-audience -s protocol=openid-connect \
    -s protocolMapper=oidc-audience-mapper -s consentRequired=false \
    -s 'config."included.client.audience"=weather-bridge-fe' \
    -s 'config."id.token.claim"=false' -s 'config."access.token.claim"=true' \
    -s 'config."introspection.token.claim"=true' >/dev/null
}

upsert_backend_client() {
  local client_uuid
  client_uuid="$("$KCADM" get clients -r "$REALM" -q clientId=weather-bridge-be --fields id --format csv --noquotes)"
  if [ -z "$client_uuid" ]; then
    client_uuid="$("$KCADM" create clients -r "$REALM" -i \
      -s clientId=weather-bridge-be \
      -s 'name=Weather Bridge AI backend (service account)' \
      -s protocol=openid-connect \
      -s publicClient=false \
      -s standardFlowEnabled=false \
      -s implicitFlowEnabled=false \
      -s directAccessGrantsEnabled=false \
      -s serviceAccountsEnabled=true \
      -s secret=dev-weather-bridge-be-secret)"
  else
    "$KCADM" update "clients/$client_uuid" -r "$REALM" \
      -s clientId=weather-bridge-be \
      -s 'name=Weather Bridge AI backend (service account)' \
      -s protocol=openid-connect \
      -s publicClient=false \
      -s standardFlowEnabled=false \
      -s implicitFlowEnabled=false \
      -s directAccessGrantsEnabled=false \
      -s serviceAccountsEnabled=true \
      -s secret=dev-weather-bridge-be-secret >/dev/null
  fi

  "$KCADM" add-roles -r "$REALM" --uusername "service-account-weather-bridge-be" \
    --cclientid realm-management --rolename view-users --rolename query-users \
    --rolename manage-users --rolename view-realm >/dev/null
}

upsert_demo_user() {
  local username="$1" first="$2" last="$3" role="$4" village="${5:-}"
  local user_id update_args
  user_id="$("$KCADM" get users -r "$REALM" -q exact=true -q "username=$username" --fields id --format csv --noquotes)"
  if [ -z "$user_id" ]; then
    user_id="$("$KCADM" create users -r "$REALM" -i \
      -s "username=$username" -s "email=$username" -s enabled=true -s emailVerified=true \
      -s "firstName=$first" -s "lastName=$last")"
  fi
  update_args=(-s "username=$username" -s "email=$username" -s enabled=true -s emailVerified=true \
    -s "firstName=$first" -s "lastName=$last")
  [ -n "$village" ] && update_args+=(-s "attributes.village_id=[\"$village\"]")
  "$KCADM" update "users/$user_id" -r "$REALM" "${update_args[@]}" >/dev/null
  "$KCADM" set-password -r "$REALM" --username "$username" --new-password 'Demo@12345' >/dev/null
  "$KCADM" add-roles -r "$REALM" --uusername "$username" --rolename user --rolename "$role" >/dev/null
}

log "waiting for Keycloak"
authenticate
wait_for_realm

current_version="$("$KCADM" get "realms/$REALM" --fields 'attributes(weatherBridgeMigrationVersion)' --format csv --noquotes)"
[ -z "$current_version" ] || [ "$current_version" = "null" ] && current_version=0
[[ "$current_version" =~ ^[0-9]+$ ]] || { log "invalid migration version: $current_version" >&2; exit 1; }

if [ "$current_version" -lt "$TARGET_VERSION" ]; then
  log "applying realm migration $current_version -> $TARGET_VERSION"
  "$KCADM" update users/profile -r "$REALM" -f "$PROFILE_FILE" >/dev/null
fi

upsert_role user "Default application user"
upsert_role admin "Van hanh he thong, cau hinh nguong, kiem dinh mo hinh"
upsert_role commune_officer "Can bo PCTT xa - xem heatmap toan xa, ra quyet dinh canh bao"
upsert_role village_head "Truong thon/ban - xem va xac nhan cho ban minh"
upsert_role resident "Nguoi dan - xem the canh bao va tu xac nhan an toan"

client_id="$("$KCADM" get clients -r "$REALM" -q clientId=weather-bridge-fe --fields id --format csv --noquotes)"
[ -z "$client_id" ] || [[ "$client_id" == *$'\n'* ]] && { log "expected exactly one weather-bridge-fe client" >&2; exit 1; }

"$KCADM" update "clients/$client_id" -r "$REALM" \
  -s standardFlowEnabled=true -s implicitFlowEnabled=false \
  -s directAccessGrantsEnabled=true -s serviceAccountsEnabled=false \
  -s 'redirectUris=["http://localhost/*","http://localhost:5173/*","https://dev.weatherbridge.online/*","https://dienbien.weatherbridge.online/*"]' \
  -s 'webOrigins=["http://localhost","http://localhost:5173","https://dev.weatherbridge.online","https://dienbien.weatherbridge.online"]' \
  -s 'attributes."pkce.code.challenge.method"=S256' \
  -s 'attributes."post.logout.redirect.uris"=http://localhost/*##http://localhost:5173/*##https://dev.weatherbridge.online/*##https://dienbien.weatherbridge.online/*' >/dev/null

upsert_village_mapper "$client_id"
upsert_frontend_audience_mapper "$client_id"
upsert_backend_client
upsert_demo_user admin@weather-bridge.local Admin Demo admin
upsert_demo_user canbo@weather-bridge.local "Can Bo" "PCTT Demo" commune_officer
upsert_demo_user truongban@weather-bridge.local "Truong Ban" "Muong Pon 1 Demo" village_head muong-pon-1
upsert_demo_user dan@weather-bridge.local "Nguoi Dan" Demo resident muong-pon-1

[ "$current_version" -lt "$TARGET_VERSION" ] && "$KCADM" update "realms/$REALM" -s "attributes.weatherBridgeMigrationVersion=$TARGET_VERSION" >/dev/null

log "realm $REALM synchronized at migration version $TARGET_VERSION"
