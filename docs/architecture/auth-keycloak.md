# Keycloak integration

## Local setup

The local realm is imported from `infra/keycloak/realm-export.json`. The
frontend client is public and uses Authorization Code with PKCE (`S256`). It has
no client secret because it runs in the browser.

The custom login theme lives at
`infra/keycloak/themes/vai-code/login`. It uses the VAI Code visual tokens while
Keycloak retains ownership of password and recovery forms.

## Production requirements

- Use a managed or separately deployed PostgreSQL database for Keycloak.
- Set a real public hostname and HTTPS-only redirect URIs.
- Replace bootstrap admin credentials with Secret Manager values.
- Keep `KEYCLOAK_ISSUER` equal to the issuer in the access token.
- Set `KEYCLOAK_AUDIENCE` when the realm is configured with an API audience.
- Configure SMTP, email verification, password policy, MFA, brute-force detection, and session timeouts.
- Export and review realm configuration as an audited release artifact.

The API never receives a Keycloak client secret and never handles user passwords.
