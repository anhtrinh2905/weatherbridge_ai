# ADR 0002: Keycloak owns identity

## Decision

Use Keycloak through OIDC Authorization Code with PKCE. The application does not
store passwords or implement email verification/reset tokens.

## Reason

Identity security, sessions, recovery, and future providers are better isolated
from product business logic. The React client keeps tokens in memory and the API
validates signed access tokens with cached JWKS keys.
