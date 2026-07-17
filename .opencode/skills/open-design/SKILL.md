---
name: open-design
description: Use when connecting OpenCode to the local Open Design daemon, reading an active design project, pulling design artifacts, or adapting Open Design tokens into fe and Keycloak theme files.
---

# Open Design

Use the `open-design` MCP server for design context instead of guessing visual
tokens or recreating an artifact from a screenshot.

## Connection

- The project-local MCP entry targets `http://127.0.0.1:7456`.
- The daemon must be running before OpenCode starts its MCP session.
- Use `get_active_context` when the user refers to the design currently open in
  Open Design.
- Use an explicit project name or id when the active context is unavailable.

## Pulling And Adapting

- Prefer `get_artifact` for the full entry file and referenced siblings.
- Preserve the artifact in `design/opendesign` before adapting it into `fe/`.
- Keep the same tokens across landing, auth, workspace, and
  `infra/keycloak/themes/vai-code`.
- Never copy daemon tokens, provider credentials, or personal data into Git.
- Run the frontend checks after adapting an artifact.

## Generation

- Discover available skills and agents before starting an Open Design run.
- Poll a started run with `get_run`; do not replace a running generation with a
  hand-written approximation.
- Pull the completed artifact and record provenance in the design handoff.
