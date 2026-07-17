# Deployment runbook

1. Build images from a reviewed commit SHA.
2. Generate and inspect the SBOM.
3. Apply infrastructure changes with Terraform plan approval.
4. Run the Alembic migration as a one-off release job.
5. Deploy the API and worker images.
6. Deploy the frontend artifact.
7. Check `/api/v1/health/live` and `/api/v1/health/ready`.
8. Run the OIDC login smoke test and one AI job smoke test.
9. Record the image digests, Keycloak realm version, and migration revision.
