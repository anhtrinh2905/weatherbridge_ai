# Open Design handoff

The Open Design project is the visual source of truth for the VAI Code template.
Keep the original artifact and tokens here before adapting them into `fe/`.

The React implementation must preserve the same tokens across landing, auth,
Keycloak theme overrides, and the protected workspace shell.

## OpenCode connection

The project-local OpenCode config exposes the local Open Design daemon as the
`open-design` MCP server:

```text
http://127.0.0.1:7456
```

Start Open Design before starting or restarting OpenCode:

```bash
od --no-open
```

The repository workflow is available as `/design-sync`. It reads the active
Open Design project, pulls the complete artifact bundle, preserves the source
under this directory, and then adapts tokens into `fe/` and the Keycloak theme.
The MCP connection uses local process transport and stores no credentials in
the repository. If the daemon asks for authentication, complete that flow in
Open Design and restart OpenCode so its MCP session is rebuilt.
