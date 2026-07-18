FROM quay.io/keycloak/keycloak:26.5.2

COPY infra/keycloak/realm-export.json /opt/keycloak/data/import/weather-bridge-realm.json
COPY infra/keycloak/themes/weather-bridge /opt/keycloak/themes/weather-bridge
