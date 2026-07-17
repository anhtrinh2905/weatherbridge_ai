# Local development

```bash
cp .env.example .env
make dev
```

Open these URLs:

- Frontend: `http://localhost:5173`
- API docs: `http://localhost:8000/docs`
- Keycloak admin: `http://localhost:8080/admin` (`admin` / `admin` locally only)
- Mailpit: `http://localhost:8025`

The first Keycloak import creates the `vai-code` realm and the public
`vai-code-fe` client. If the realm is changed, remove the local Keycloak volume
and restart the stack rather than editing a running realm manually.
