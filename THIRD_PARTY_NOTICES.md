# Third-party notices

This file records third-party source and dependencies used by the project. The
lockfiles are authoritative for exact versions; this list records the license
and attribution obligations.

## Frontend

- React: MIT
- Vite: MIT
- TypeScript: Apache-2.0
- Tailwind CSS: MIT
- shadcn/ui source components: MIT; preserve the shadcn copyright and license notice
- Radix UI: MIT
- React Hook Form: MIT
- Zod: MIT
- TanStack Query: MIT
- React Router: MIT
- Lucide React: ISC
- keycloak-js: Apache-2.0

## Identity infrastructure

- Keycloak server: Apache-2.0. The project is consumed as an external service;
  no Keycloak source is vendored. Custom theme files in `infra/keycloak/themes`
  are original project code.

## AI infrastructure

- LiteLLM gateway: MIT; consumed as a pinned container image and configured via
  `infra/litellm/config.yaml`.
- Langfuse Python SDK/service: MIT; enabled only when tracing credentials and
  endpoint are configured.

Transitive dependencies must be checked by CI before release.

## Vendored source

Vendored repositories must have their source URL, exact commit, license file,
modification summary, and notice recorded in `third_party/` and
`docs/compliance/oss-register.yaml`.
