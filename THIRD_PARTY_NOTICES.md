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

- UI/UX Pro Max Skill: MIT; vendored under
  `third_party/ui-ux-pro-max-skill/` from
  `https://github.com/nextlevelbuilder/ui-ux-pro-max-skill` at commit
  `f8ac5e1266dba8354ea96e19994d9f4345e7ec31`.

## Vendored data

- Mường Pồn commune boundary (`fe/src/features/demo/boundary.ts`): derived from
  OpenStreetMap relation `19571212` via Nominatim on 2026-07-18; © OpenStreetMap
  contributors, ODbL 1.0. Simplified (Douglas–Peucker) and normalized; see
  `docs/compliance/data-provenance.md` for the transformation record.
- Điện Biên commune sampling centroids in
  `data/catalogs/dien_bien_disaster_inventory_v1.json`: derived from the
  OpenStreetMap relations listed per row; © OpenStreetMap contributors, ODbL
  1.0.
- Open-Meteo historical forecast, previous-runs, and historical-weather data:
  CC BY 4.0 attribution to Open-Meteo; originating model-provider and
  Open-Meteo usage terms also apply. Generated data remains outside Git under
  `data/processed/training/`.
