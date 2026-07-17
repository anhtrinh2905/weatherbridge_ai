---
description: Connect to Open Design, pull the active artifact, and synchronize its tokens across the VAI Code frontend and Keycloak theme.
agent: build
---

Use the local `open-design` MCP server for this task.

1. Call `get_active_context` and `list_projects`. If there is no active project,
   use the project named by `$ARGUMENTS`; if neither exists, stop and report the
   exact connection or project blocker.
2. Call `get_artifact` for the selected project and inspect the full bundle
   before editing the repository.
3. Preserve the original artifact and token notes under `design/opendesign/`.
4. Adapt the shared visual language into `fe/` and
   `infra/keycloak/themes/vai-code` without changing API, auth, or deployment
   boundaries.
5. Run `make check` and `pnpm --dir fe build` after the synchronization.
6. Summarize which artifact files and tokens were imported, and record any
   missing Open Design authentication or project access as a blocker.
