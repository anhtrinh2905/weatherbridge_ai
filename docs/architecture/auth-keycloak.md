# Keycloak integration

## Local setup

The local realm is imported from `infra/keycloak/realm-export.json`. The
frontend client is public and uses Authorization Code with PKCE (`S256`). It has
no client secret because it runs in the browser.

K3s deployments also run the versioned, idempotent realm sync in
`infra/keycloak/sync-realm.sh`. Keycloak realm imports use `IGNORE_EXISTING`, so
the sync is the migration path for client, role, mapper, and seeded identity
changes after the realm database has been created. It must preserve unrelated
users and configuration.

The custom login theme lives at
`infra/keycloak/themes/weather-bridge/login`. It uses the Weather Bridge AI visual tokens while
Keycloak retains ownership of password and recovery forms.

## Production requirements

- Use a managed or separately deployed PostgreSQL database for Keycloak.
- Set a real public hostname and HTTPS-only redirect URIs.
- Replace bootstrap admin credentials with Secret Manager values.
- Keep `KEYCLOAK_ISSUER` equal to the issuer in the access token.
- Set `KEYCLOAK_AUDIENCE` when the realm is configured with an API audience.
- Configure SMTP, email verification, password policy, MFA, brute-force detection, and session timeouts.
- Export and review realm configuration as an audited release artifact.
- Run realm migrations in dev before promoting the same Keycloak image to prod.

The API never receives a Keycloak client secret and never handles user passwords.
