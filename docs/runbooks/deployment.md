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
10. Run the research database sync. It seeds the versioned disaster catalog and
    verifies that the PostgreSQL PVC still contains the collected forecast and
    observation rows. The pull deploy agent performs this automatically after
    health/OIDC smoke checks.

The sync is safe to repeat and never drops or truncates research tables:

```bash
make research-db-sync
```

For Kubernetes:

```bash
scripts/sync-research-database.sh \
  --target k8s \
  --namespace weather-bridge-prod
```

A fresh environment without collected data intentionally fails when
`RESEARCH_DB_REQUIRE_DATA=true`. Seed and collect it once with an explicit,
reviewed operation:

```bash
scripts/sync-research-database.sh \
  --target k8s \
  --namespace weather-bridge-prod \
  --collect \
  --export
```

Do not run `--collect` on every merge: it is a large upstream backfill and may
take a long time. PostgreSQL PVC data, not generated CSV files in Git, is the
source of truth. Create a custom-format backup before a production migration:

```bash
scripts/backup-research-database.sh \
  --target k8s \
  --namespace weather-bridge-prod \
  --output-dir /var/lib/weatherbridge-deploy/backups/prod
```

The backup directory must be on persistent storage with an appropriate retention
policy; it must not be committed to Git.
