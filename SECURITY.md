# Security Policy

## Reporting

Do not open a public issue for a credential, personal-data exposure, or
exploitable vulnerability. Contact the project maintainers privately and include
the affected component, impact, reproduction steps, and a safe remediation idea.

## Baseline

- OWASP ASVS is the application security checklist.
- Keycloak owns credentials, password policy, email verification, and recovery.
- The SPA uses Authorization Code with PKCE and does not store tokens in `localStorage`.
- The API validates issuer, algorithm, signature, expiry, and client binding.
- Auth endpoints must have rate limiting before public production traffic.
- CORS origins are explicit; wildcard origins are not allowed with credentials.
- Logs must not contain passwords, tokens, or raw sensitive input.
