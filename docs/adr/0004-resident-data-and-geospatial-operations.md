# ADR 0004: Resident data and geospatial operations

## Decision

Use PostgreSQL 16 with PostGIS as the operational database. Keycloak remains
the source of authentication and roles; PostgreSQL stores business profiles
and time-bounded area assignments used for authorization in backend services.

Resident PII is encrypted with AES-GCM in the application and exact-match
lookups use keyed HMAC values. Geographic points that must remain queryable are
protected by database least privilege, storage encryption, and audit records.
The default runtime mode is `simulated`; `live` fails to start without explicit
encryption and hash keys.

Hazard rasters remain in object storage. PostgreSQL stores manifests, checksums,
vectorized zones, current-layer pointers, and short-lived signed object URLs.
Notification delivery uses an idempotent outbox owned by the worker.

## Consequences

- Real PII remains prohibited until the privacy, consent, audit, retention, and
  legal gates are approved and deployment secrets are provisioned.
- Backend services, rather than JWT village claims or frontend filters, enforce
  resident and officer area scope.
- PostGIS is required before migration `0005`; downgrades intentionally retain
  the extension because other schemas may depend on it.
- Demo imports must set `simulated=true` and may be safely re-run.
