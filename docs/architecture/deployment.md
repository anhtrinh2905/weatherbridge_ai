# Deployment topology

## Development

`infra/compose/compose.yaml` provides PostgreSQL, Redis, Mailpit, and Keycloak.
`compose.dev.yaml` adds the API, worker, and Vite dev server with source mounts.

## Single-server production

Use `compose.prod.yaml` only for a deliberately managed single Docker host. It
removes source mounts, uses restart policies, and places Nginx in front of the
frontend and API.

## Cloud production

Use one immutable image per deploy unit:

- `fe`: static web image or CDN artifact.
- `be`: stateless HTTP service.
- `worker`: independently scaled background process.
- optional `model-server`: GPU or managed inference service.
- optional `litellm`: OpenAI-compatible model gateway, deployed as a backing service rather than imported into the API process.
- optional `langfuse`: external or self-hosted LLM observability service called by the backend adapter.

Use managed PostgreSQL, Redis, object storage, secret management, a container
registry, and centralized telemetry. The provider-specific Terraform modules
belong under `infra/terraform/environments/` after the cloud target is chosen.
