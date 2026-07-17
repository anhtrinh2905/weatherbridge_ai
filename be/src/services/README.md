# Application services

This directory is reserved for business use cases that should not live in
FastAPI route handlers.

Examples for future modules:

- `profile_service.py`: synchronize optional local profile data with Keycloak.
- `ai_job_service.py`: create, authorize, and transition AI jobs.
- `notification_service.py`: coordinate user-facing notifications.

Keep external clients, database sessions, and queue implementations behind
small dependencies. Services should be testable without an HTTP request.
