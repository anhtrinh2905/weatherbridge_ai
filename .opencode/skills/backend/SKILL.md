---
name: backend
description: Use when changing FastAPI routes, Keycloak token validation, SQLAlchemy, Alembic, queues, or application services in be.
---

# Backend

Keep `be/src` direct. Route handlers validate and delegate; services own use
cases; database models and response schemas remain separate. Validate Keycloak
issuer, algorithm, signature, expiry, and client binding. Run migration and API
tests for persistence changes.
