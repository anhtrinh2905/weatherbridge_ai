# K3s deployment (micace-server) — prod (`dienbien.`) + dev (`dev.`)

This directory targets the single-node K3s cluster on `micace-server` that is
already reachable from the internet via Cloudflare Tunnel:

```
Internet ──HTTPS──► Cloudflare ──Tunnel──► localhost:30080 (K3s nginx ingress)
                                              │
                          Host: dienbien.weatherbridge.online       → fe / be   (prod)
                          Host: dienbien-auth.weatherbridge.online   → keycloak  (prod)
                          Host: dev.weatherbridge.online             → fe / be   (dev)
                          Host: dev-auth.weatherbridge.online        → keycloak  (dev)
```

TLS is terminated at Cloudflare. nginx ingress only serves plain HTTP on its NodePort
(`30080`) and routes by `Host` header, so the `Ingress` resources here do not
configure TLS.

## Layout

```
infra/k8s/
├── base/                  # shared manifests (namespace, postgres, redis,
│                          # keycloak, be, worker, fe, ingress, configmap)
│   └── kustomization.yaml
└── overlays/
    ├── dienbien/          # PROD  — push to `main`
    │   └── kustomization.yaml   # namespace weather-bridge-prod,
    │                            # subdomain dienbien./dienbien-auth.
    └── dev/               # DEV  — push to `dev`
        └── kustomization.yaml   # namespace weather-bridge-dev,
                                 # subdomain dev./dev-auth.
```

Each overlay only patches env-specific values (namespace, subdomain, Keycloak
hostname, CORS, `APP_ENV`). Images are pinned by the deploy workflow at render
time via `kustomize edit set image`.

## Environments

| Env  | Branch   | Overlay    | Namespace            | FE / API host                    | Keycloak host                          | GitHub Environment |
|------|----------|------------|----------------------|----------------------------------|----------------------------------------|--------------------|
| prod | `main`   | `dienbien` | `weather-bridge-prod`| `dienbien.weatherbridge.online`  | `dienbien-auth.weatherbridge.online`   | `prod`             |
| dev  | `dev`    | `dev`      | `weather-bridge-dev` | `dev.weatherbridge.online`       | `dev-auth.weatherbridge.online`        | `dev`              |

Each environment is fully isolated on the same K3s node: separate namespace,
separate PostgreSQL StatefulSets (`db` + `keycloak-db`), separate Redis, separate
Keycloak, separate PVCs. Dev cannot break prod data.

## What gets deployed per overlay

| Component  | Kind          | Notes                                                        |
|------------|---------------|--------------------------------------------------------------|
| db         | StatefulSet   | PostgreSQL 16, 10Gi PVC, app database                        |
| keycloak-db| StatefulSet   | PostgreSQL 16, 5Gi PVC, Keycloak database                    |
| redis      | Deployment    | Redis 7, 2Gi PVC                                             |
| keycloak   | Deployment    | `weather-bridge/keycloak`, env-specific `KC_HOSTNAME`        |
| be         | Deployment    | `weather-bridge/be`, runs Alembic migrations as initContainer |
| worker     | Deployment    | `weather-bridge/worker`                                      |
| fe         | Deployment    | `weather-bridge/fe`, nginx serving built Vite assets         |

`base/secret-template.yaml` documents the Secret shape but is intentionally NOT
part of `kustomization.yaml`. Real secret values are pushed from GitHub Actions
during the deploy workflow and never committed.

## Prerequisites on micace-server

1. K3s installed and running; `kubectl get nodes` reports `Ready`.
2. nginx ingress exposed on `localhost:30080` (Cloudflare Tunnel target).
3. `kubectl` reachable from the SSH user that GitHub Actions uses.
4. The SSH user can run `kubectl apply`, `kubectl create secret`, and
   `kubectl rollout status` in both `weather-bridge-prod` and
   `weather-bridge-dev` namespaces.
5. Image pull: K3s must be able to pull from `ghcr.io`. For private packages
   create a registry pull secret and reference it via `imagePullSecrets` on each
   Deployment. Public packages need no auth.

## Cloudflare Tunnel configuration

Add all four hostnames to the `cloudflared` config on micace-server, all
pointing at the same nginx ingress NodePort:

```yaml
# cloudflared config.yml (on micace-server)
ingress:
  - hostname: dienbien.weatherbridge.online
    service: http://localhost:30080
  - hostname: dienbien-auth.weatherbridge.online
    service: http://localhost:30080
  - hostname: dev.weatherbridge.online
    service: http://localhost:30080
  - hostname: dev-auth.weatherbridge.online
    service: http://localhost:30080
  - service: http_status:404
```

Then create DNS CNAMEs in Cloudflare for each host pointing to the tunnel
(`<tunnel-id>.cfargotunnel.com`), or let cloudflared do it:

```bash
cloudflared tunnel route dns <tunnel> dienbien.weatherbridge.online
cloudflared tunnel route dns <tunnel> dienbien-auth.weatherbridge.online
cloudflared tunnel route dns <tunnel> dev.weatherbridge.online
cloudflared tunnel route dns <tunnel> dev-auth.weatherbridge.online
```

## Pull-based CD (no inbound SSH or Tailscale dependency)

GitHub Actions never connects to K3s. It verifies the repository and publishes
four immutable GHCR images. A systemd timer on micace-server polls the branch,
waits until all four images exist for the exact commit SHA, then deploys that
SHA locally with `kubectl`.

Install on micace-server from a checkout of this repository:

```bash
sudo scripts/install-pull-cd.sh --enable-dev
sudo systemctl status weatherbridge-deploy@dev.timer
```

The installer creates:

- `/usr/local/libexec/weatherbridge/pull-deploy`;
- `/etc/systemd/system/weatherbridge-deploy@.service`;
- `/etc/systemd/system/weatherbridge-deploy@.timer`;
- `/etc/weatherbridge/common.env`, `dev.env`, and `prod.env` (mode `0600`);
- `/var/lib/weatherbridge-deploy/<env>.sha` after a successful deployment.

Keep `DEPLOY_ENABLED=false` until the workflow is present on the watched branch
and the packages are readable. Then enable dev in `/etc/weatherbridge/dev.env`:

```text
DEPLOY_ENABLED=true
```

If packages are public, leave `GHCR_USER` and `GHCR_TOKEN` empty. For private
packages, put a token with only `read:packages` in
`/etc/weatherbridge/common.env`. The agent creates `ghcr-pull` locally; GitHub
does not receive K3s, SSH, database, or Keycloak secrets.

Application secrets remain native Kubernetes Secrets (`app-secret`,
`db-secret`, `keycloak-secret`) in each namespace. The pull agent refuses a
deployment when any required Secret is missing.

## Deploy flow

1. Push `dev` or `main`.
2. GitHub Actions runs checks/tests and publishes all four images tagged with
   `${{ github.sha }}` plus `latest-dev` or `latest-prod`.
3. The dev timer polls every two minutes, resolves `origin/dev`, and does
   nothing until every SHA-tagged image is available.
4. The agent renders the matching overlay, verifies required Secrets, applies
   manifests, waits for all rollouts, and smoke-tests API/frontend/OIDC.
5. Only after success does it atomically record the deployed SHA.
6. Production has no enabled timer. Promote it manually after dev validation:

```bash
sudo systemctl start weatherbridge-deploy@prod.service
```

Migrations run as an `initContainer` of the `be` Deployment, so every rollout
runs `alembic upgrade head` before the new `be` pod serves traffic. Alembic is
idempotent, so re-runs are safe; keep `be` at one replica until you add an
Alembic advisory-lock guard for concurrent migrators.

## Keycloak hostname and email

Keycloak's `KC_HOSTNAME` is an explicit HTTPS URL in each overlay
(`https://dev-auth.weatherbridge.online` or
`https://dienbien-auth.weatherbridge.online`). Do not replace it with a bare
hostname: Cloudflare terminates TLS before forwarding HTTP to nginx ingress,
and a bare hostname makes Keycloak advertise `http://` OIDC endpoints and can
redirect browsers to the wrong origin.

The checked-in realm keeps email verification and password recovery disabled
until a real production SMTP provider is configured. The previous local
`mailpit:1025` SMTP target only exists in Docker Compose and is not reachable
from K3s. Before enabling these features in prod, configure an SMTP Secret,
apply it to the realm through the Keycloak Admin API, and run a delivery smoke
test.

## Local rendering (no apply)

```bash
make k8s-render-prod      # infra/k8s/overlays/dienbien -> /tmp/wb-prod.yaml
make k8s-render-dev       # infra/k8s/overlays/dev      -> /tmp/wb-dev.yaml
```

or directly:

```bash
kustomize build infra/k8s/overlays/dienbien
kustomize build infra/k8s/overlays/dev
```

## Rollback

Each deployment is pinned to a commit SHA. Roll back to an already-published
compatible SHA from micace-server:

```bash
sudo TARGET_SHA=<40-character-sha> FORCE_DEPLOY=true \
  /usr/local/libexec/weatherbridge/pull-deploy prod
```

This does not downgrade PostgreSQL. Only roll back across database-compatible
releases; schema rollback requires a separate reviewed migration procedure.

## Backups

PostgreSQL and Redis use `ReadWriteOnce` PVCs on the K3s node. There is no
automated backup in this manifest set yet; add Velero or a scheduled `pg_dump`
CronJob (per namespace) before relying on prod for real data.
