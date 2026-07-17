FROM quay.io/keycloak/keycloak:26.5.2

COPY infra/keycloak/realm-export.json /opt/keycloak/data/import/vai-code-realm.json
COPY infra/keycloak/themes/vai-code /opt/keycloak/themes/vai-code
