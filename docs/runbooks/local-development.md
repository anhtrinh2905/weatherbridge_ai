# Local development

```bash
docker compose up
```

This is the complete bootstrap command. Compose builds the application images,
starts the backing services, imports the local Keycloak realm, applies database
migrations, and then starts the API, worker, frontend, and reverse proxy.

Open these URLs:

- Frontend: `http://localhost:5173`
- API docs: `http://localhost:8000/docs`
- Keycloak admin: `http://localhost:8080/admin` (`admin` / `admin` locally only)
- Mailpit: `http://localhost:8025`
- PostgreSQL: `localhost:5432` (`vai` / `vai`, database `weather_bridge`)

The first Keycloak import creates the `weather-bridge` realm and the public
`weather-bridge-fe` client. Realm imports do not overwrite an existing realm. After
changing the realm export, run `docker compose down --volumes` before starting the
stack again; this deletes local development data.
