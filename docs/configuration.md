# Configuration

## Environment variables (backend)

| Variable | Default | Purpose |
|---|---|---|
| `JWT_SECRET` | insecure dev default | Signing key for auth tokens. **Must** be set in production; the install script generates one. |
| `NATS_URL` | — | NATS server URL for talking to the root-worker. |
| `NATS_USER` / `NATS_PASS` | — | NATS credentials. |
| `INSTALL_DIR` | — | Installation root; anchors runtime paths (e.g. the bundled `server.js`). |
| `DASHBOARD_PATH` | — | Path to the built dashboard the backend serves. In dev, point it at `apps/dashboard/dist`. |
| `WALLPAPER_DIR` | under `INSTALL_DIR` | Where uploaded desktop wallpapers are stored. |
| `NODE_ENV` | — | Standard Node environment flag. |
| `HSI_TELEMETRY_ENABLED` | `true` | Set to `false`, `0`, `off` or `no` to disable anonymous daily telemetry. |
| `HSI_TELEMETRY_URL` | `https://hsi-telemetry.theo-labs.dev/v1/heartbeat` | HTTPS heartbeat endpoint used by the best-effort telemetry client. |
| `HSI_VERSION` | package version | Optional explicit version reported by packaged deployments. |

> If `JWT_SECRET` is unset the backend logs a warning and uses an insecure
> default — never do this in production.

Telemetry sends only the anonymous hardware and version fields documented by
the telemetry service. Failures time out after three seconds and never block
startup or normal HSI features. The random installation UUID and last-success
timestamp are stored under `INSTALL_DIR/data` and survive upgrades.

## Install / update options

The installer (`scripts/install.sh`, run via the README one-liner) accepts these
environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `VERSION` | latest release | Install/pin a specific tag, e.g. `VERSION=v1.28.1`. |
| `INSTALL_DIR` | `/opt/hsi` | Installation directory. |
| `APP_USER` | `app` | System user the backend runs as. |
| `BACKEND_PORT` | `9001` | API port. |
| `NATS_SERVER_VERSION` | `v2.10.24` | NATS binary version to download. |
| `SKIP_NGINX` | `0` | Skip nginx configuration. |
| `SKIP_SEED` | `0` | Skip seeding the initial `admin / admin` account. |

Re-running the installer detects an existing installation, **preserves the
database and all secrets**, and restarts only the application services.

## systemd services

| Unit | Role |
|---|---|
| `hsi-nats` | NATS JetStream message broker |
| `hsi-root-worker` | Privileged filesystem/disk worker (runs as root) |
| `hsi` | Backend API + static dashboard server |

```bash
systemctl status hsi hsi-root-worker hsi-nats
journalctl -u hsi -f            # follow backend logs
journalctl -u hsi-root-worker -f
```

## Ports

- **9001** — backend API + dashboard (configurable via `BACKEND_PORT`)
- **80** — nginx reverse proxy, if present (optional)
- NATS listens locally for the backend ↔ root-worker channel

## First login

The installer seeds an `admin / admin` account (unless `SKIP_SEED=1`).
**Change the admin password immediately after first login.**
