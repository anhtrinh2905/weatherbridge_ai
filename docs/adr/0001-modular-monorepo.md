# ADR 0001: Modular monorepo with independent deploy units

## Decision

Keep `fe`, `be`, `worker`, `ai`, and `infra` in one repository while building
separate runtime images for the frontend, API, worker, and optional model server.

## Reason

The hackathon needs atomic contract changes without the operational cost of
microservices. Deployment boundaries remain explicit for later scaling.
