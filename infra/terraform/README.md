# Terraform boundary

The repository keeps Terraform provider-neutral until the deployment target is
chosen. Each environment must eventually own:

- network and ingress;
- PostgreSQL and backups;
- Redis or a managed queue;
- container registry and immutable image references;
- Keycloak deployment or a managed identity service;
- object storage;
- secret management;
- logging, metrics, traces, and alerts.

Do not put business logic in Terraform. Do not commit state files or secret
variable values.
