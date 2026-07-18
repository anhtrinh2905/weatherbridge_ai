---
title: 'Complete Epic 1 authentication and role-based access'
type: 'feature'
created: '2026-07-18'
status: 'in-progress'
review_loop_iteration: 0
baseline_commit: 'cd4433ab6511a8502f7a25912ccec0eed01bf2aa'
context:
  - 'docs/epics.md'
  - 'docs/architecture/auth-keycloak.md'
  - 'docs/design/handoff.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Epic 1 has four Keycloak roles and role-specific UI, but browser demo login bypasses PKCE with a password grant, JWT validation accepts missing required claims, and backend routes do not enforce role or village scope.

**Approach:** Make Authorization Code + PKCE the only browser authentication path, harden token verification fail-closed, add reusable backend role/village authorization, and verify the existing shared-design role shell without redesigning it.

## Boundaries & Constraints

**Always:** Keep tokens in memory; keep Keycloak as identity owner; pin RS256 and validate issuer, expiry, subject, authorized party, and optional audience; enforce permissions server-side with 401/403 tests; preserve the four roles and slug-form `village_id`; keep route handlers thin; regenerate OpenAPI types rather than hand-writing DTOs.

**Ask First:** Adding dependencies, changing role names or priority, changing `village_id` to UUID, adding resident/domain database models, or enabling mandatory audience before the realm emits a dedicated API audience.

**Never:** Store tokens in browser persistence; use Resource Owner Password Credentials, implicit flow, a browser client secret, frontend-only authorization, a fallback village, real PII, or redesign the existing visual system.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| Standard sign-in | User selects login or seeded demo username | Redirect to Keycloak Authorization Code + PKCE S256; username may be prefilled | Keycloak owns credential errors |
| Valid token | RS256 token with required claims and recognized app role | User identity includes effective role and validated optional village scope | N/A |
| Invalid token | Missing/expired `exp`, bad issuer/signature/algorithm, missing/mismatched `azp`, malformed claims | Protected API returns 401 | Stable application error envelope |
| Forbidden action | Authenticated role calls a disallowed route | API returns 403 | No data or action leakage |
| Village scope | Village head requests own vs another village | Own scope allowed; cross-village denied | 403 for mismatch; malformed identifier rejected |
| Missing village claim | Village head/resident lacks valid `village_id` | Authentication/UI fails closed | 401 API; forbidden UI |

</frozen-after-approval>

## Code Map

- `be/src/auth/keycloak.py` -- JWT/JWKS verification and normalized `CurrentUser`.
- `be/src/auth/authorization.py` -- four-role policy, priority, and village-scope checks.
- `be/src/api/deps.py` -- HTTP Bearer authentication and reusable role dependencies.
- `be/src/api/v1/endpoints/{auth,forecasts,ai_jobs}.py` -- protected route policy integration.
- `be/tests/` -- signed-token, authorization, endpoint denial, and scope regression tests.
- `fe/src/features/auth/{keycloak,demoAccounts,roles}.ts*` -- PKCE lifecycle and role mapping.
- `fe/src/app/` and `fe/src/pages/` -- protected routing, fail-closed scope, role navigation.
- `infra/keycloak/realm-export.json` -- public PKCE client with direct/implicit/service-account grants disabled.
- `fe/src/shared/api/` -- generated Bearer-aware OpenAPI contract.

## Tasks & Acceptance

**Execution:**
- [ ] `be/src/auth/keycloak.py`, `be/src/api/deps.py` -- require valid JWT claims, expose HTTP Bearer security, cache/refresh JWKS safely, and normalize roles/village scope.
- [ ] `be/src/auth/authorization.py`, protected endpoints -- enforce four-role and village policies; restrict forecast refresh to admin/officer and AI jobs to intended operational roles.
- [ ] `be/tests/` -- cover valid signed tokens, each validation failure, 401/403 matrices, role priority, ownership, and cross-village denial.
- [ ] `fe/src/features/auth/`, `fe/src/pages/auth/LoginPage.tsx` -- remove embedded password/direct-grant code and route seeded usernames through standard PKCE login.
- [ ] `fe/src/app/`, scoped layouts/pages, frontend tests -- initialize protected deep links, test role redirects/navigation, and reject missing village scope without fallback.
- [ ] `infra/keycloak/realm-export.json`, generated API files, Epic 1 story/status docs -- harden client settings, regenerate contracts, and record acceptance evidence.

**Acceptance Criteria:**
- Given the public browser client, when any user signs in or refreshes a session, then only Authorization Code + PKCE S256 is used and no token/password/client secret is persisted or sent to the API.
- Given a Bearer token, when the API authenticates it, then signature/JWKS, RS256, issuer, expiry, subject, client binding, and configured audience are enforced fail-closed.
- Given each of the four roles, when protected API/UI surfaces are accessed, then only allowed actions/navigation are available and wrong roles receive 403 or `/forbidden`.
- Given a village head, when village scope is evaluated, then only the claimed village is allowed and cross-village access is denied server-side.
- Given Open Design tokens and a recognized role, when the app shell and Keycloak theme render, then the existing shared visual system and role-specific navigation remain intact.

## Design Notes

Backend authorization is the security boundary; frontend guards are UX only. Since resident persistence belongs to Epic 4, Epic 1 proves village isolation through a reusable scope policy and integration test without introducing resident tables. Existing imported realms require manual recreation or administration to apply realm-export changes; verification must not delete user volumes automatically.

## Verification

**Commands:**
- `make generate-contracts` -- OpenAPI and TypeScript client regenerate cleanly.
- `make check` -- lint, typecheck, Ruff, and mypy pass.
- `make test` -- frontend/backend/worker/AI suites pass.
- `make build` -- frontend and all five images build.
- `docker compose up --build -d --wait` -- local topology becomes healthy without destructive volume operations.
