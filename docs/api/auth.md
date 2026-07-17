# Authentication API

The application does not expose password or registration endpoints. Keycloak
handles those flows through OIDC.

Backend endpoints:

- `GET /api/v1/auth/config`: public frontend configuration.
- `GET /api/v1/auth/me`: validates a Bearer token and returns the application user claims.
- `POST /api/v1/ai/jobs`: requires a valid Keycloak Bearer token.

The frontend uses `keycloak-js` with Authorization Code + PKCE (`S256`). Tokens
remain in memory and are never written to `localStorage`.
