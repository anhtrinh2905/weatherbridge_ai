FROM quay.io/keycloak/keycloak:26.7.3

COPY infra/keycloak/realm-export.json /opt/keycloak/data/import/weather-bridge-realm.json
COPY infra/keycloak/user-profile.json /opt/keycloak/data/migrations/weather-bridge-user-profile.json
COPY --chmod=0755 infra/keycloak/sync-realm.sh /opt/keycloak/bin/sync-weather-bridge-realm.sh
COPY infra/keycloak/themes/weather-bridge /opt/keycloak/themes/weather-bridge

RUN sed -i 's/\r$//' /opt/keycloak/bin/sync-weather-bridge-realm.sh
