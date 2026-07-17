# Rollback

- Roll back application images to the previous immutable digest.
- Do not automatically downgrade database migrations.
- If a migration is backward-compatible, keep it and roll back application code.
- If data repair is required, create an explicit migration and backup plan.
- Revoke affected Keycloak sessions if an identity or token issue is suspected.
- Record the incident, impact, timeline, and follow-up action.
