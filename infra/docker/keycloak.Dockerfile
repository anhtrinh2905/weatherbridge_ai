FROM quay.io/keycloak/keycloak:26.7.0

COPY infra/keycloak/realm-export.json /opt/keycloak/data/import/vai-code-realm.json
COPY infra/keycloak/themes/vai-code /opt/keycloak/themes/vai-code
