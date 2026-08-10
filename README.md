# Home Server Interface

> [!WARNING]
> **Early stage software.** This project is under active development and has not been audited for security. It may contain vulnerabilities, incomplete features, or breaking changes without notice. Use at your own risk, preferably on an isolated network.
> Tested on **Ubuntu 24.04** only. Other distributions are not officially supported.

[![Latest release](https://img.shields.io/github/v/release/kittyruntime/home-server-interface)](https://github.com/kittyruntime/home-server-interface/releases/latest)
[![License: MPL-2.0](https://img.shields.io/badge/license-MPL--2.0-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Linux%20x86--64-fcc624?logo=linux&logoColor=black)](#requirements)

**Home Server Interface (HSI)** is an open-source control panel for managing a home server or NAS
from one modern web interface. Browse and share files, deploy self-hosted apps, operate Docker,
manage disks and RAID, monitor hardware, control users, and automate encrypted or rsync backups.

HSI combines a responsive dashboard with an optional windowed desktop experience. It is designed
for a single Linux server and keeps privileged operations behind a dedicated, isolated worker.

[Install](#install) · [Features](#features) · [Documentation](#documentation) · [Releases](https://github.com/kittyruntime/home-server-interface/releases)

---

![Demo](docs/demo.gif)

---

| List view | Grid view |
|---|---|
| ![File browser — list view](docs/screenshots/fm-row.png) | ![File browser — grid view](docs/screenshots/fm-grid.png) |

![Upload in progress](docs/screenshots/fm-upload.png)

---

## Features

### A complete home-server workspace

- **Responsive dashboard** with CPU, memory, storage, system, container and disk-health widgets.
- **Classic and desktop layouts**: use a mobile-friendly sidebar or a windowed desktop with a dock,
  launchpad, movable windows, wallpaper, light/dark themes and a custom accent colour.
- **Account-synced preferences** for themes and reorderable navigation.

### Reliable file management and sharing

- Browse, search, create, rename, move, copy, delete, download and edit files from the browser.
- Resumable chunked uploads with SHA-256 integrity checks, pause/resume/cancel controls, live speed,
  retry support and protection against insufficient disk space.
- Built-in code editor with syntax highlighting and formatting for common web and data formats.
- **Places** map friendly names to server paths, with per-user and per-group Read, Write, Delete and
  Share permissions.
- Expiring public file/folder links, including guarded ZIP downloads for complete folders.
- Optional **SMB/Samba sharing** with guest/read-only policies, live connections, password sync and
  diagnostics that explain access problems.

### Docker and self-hosted applications

- Inspect, create, edit, start, stop and restart containers; view logs and manage ports, environment
  variables, mounts, networks, labels and advanced settings.
- Import Compose YAML to prefill a container configuration.
- Curated **App Store** with guided installation for popular self-hosted applications, pinned image
  versions, generated secrets, real application icons and live install/runtime state.
- Host-port conflict warnings and per-port public URL/HTTPS metadata.

### Storage and hardware operations

- Discover disks and partitions, inspect S.M.A.R.T. health, format disks and manage partition tables.
- Create and stop `mdadm` RAID arrays with rebuild progress and degraded-array alerts.
- Manage LVM physical volumes, volume groups and logical volumes.
- Mount and unmount filesystems, optionally persisting safe entries in `/etc/fstab`.
- Safety checks prevent destructive operations on active RAID members, LVM volumes and mounted data.

### Monitoring, alerts and lifecycle controls

- Live and historical CPU, RAM and network metrics over 1 hour, 6 hours, 24 hours or 7 days.
- System details, storage widgets and a filterable audit trail for privileged actions.
- Background RAID and S.M.A.R.T. alerts, visible without opening the Storage app.
- Check and apply HSI updates, restart the application, or reboot the host with confirmation and a
  reconnect timeline.
- Optional anonymous daily telemetry for aggregate hardware/version insights. It excludes hostnames,
  network addresses, serial numbers, paths and user data, and can be disabled with
  `HSI_TELEMETRY_ENABLED=false`.

### Two layers of backup

1. **HSI configuration backup and restore** — export a transactionally consistent database encrypted
   with AES-256-GCM and a password-derived key. Restore verifies encryption, SQLite integrity and
   schema compatibility, retains the previous database as a rollback copy, then restarts HSI.
2. **Scheduled rsync data backups** — push NAS folders to local or SSH destinations, or pull remote
   folders onto the NAS. Run plans manually, hourly, daily or weekly with exclusions, compression,
   bandwidth limits, status history and an explicitly enabled mirror mode.

Remote backups use a pre-provisioned SSH key with strict host-key verification. HSI never stores SSH
passwords and invokes `rsync` with validated arguments without passing commands through a shell.

### Users, permissions and security boundaries

- Linux-valid HSI accounts map consistently to filesystem and Samba identities.
- Groups and a clear per-Place permission matrix replace opaque role expressions.
- Separate Admin, User manager and Storage admin capabilities support least-privilege delegation.
- Permission changes and account demotions take effect on the next request; login attempts are rate
  limited and sensitive audit values are redacted.
- The web backend runs unprivileged. A dedicated root worker receives typed jobs through NATS
  JetStream and performs only validated filesystem, Docker, storage, sharing and host operations.
- Long-running copies, uploads, archives and backups continue as background jobs independently of the
  browser tab.

---

## Documentation

Developer and operator documentation lives in [`docs/`](docs/):

- [Architecture](docs/architecture.md) — processes, privilege isolation, data flow, tech stack
- [Development](docs/development.md) — local setup, build, project layout, release process
- [Configuration](docs/configuration.md) — environment variables, services, install/update options
- [Design system](docs/design-system.md) — tokens, shared components and frontend conventions

---

## Requirements

- A Linux server (x86-64)
- `curl`, `openssl`, `rsync`, an OpenSSH client
- Optional: Docker for containers and the App Store; Samba for SMB shares
- Ports 80 (nginx, optional) and 9001 (backend) reachable from clients

---

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/kittyruntime/home-server-interface/main/scripts/install.sh | sudo bash
```

The script:
1. Creates a system user
2. Installs Node.js 22 via nvm (in the app user's home)
3. Downloads and installs the [NATS](https://nats.io) message broker
4. Installs the `root-worker` privilege worker
5. Applies the database schema
6. Seeds an `admin / admin` account
7. Registers and starts three systemd services: `hsi-nats`, `hsi-root-worker`, `hsi`

   Older installs that used the previous default name (`app`) are migrated in place automatically on their next update.
8. Configures nginx if present

> **Change the admin password immediately after first login.**

### Update

Re-run the same command. The script detects an existing installation, preserves the database and all secrets, and restarts only the application services.

```bash
curl -fsSL https://raw.githubusercontent.com/kittyruntime/home-server-interface/main/scripts/install.sh | sudo bash
```

### Pin a version

```bash
curl -fsSL https://raw.githubusercontent.com/kittyruntime/home-server-interface/main/scripts/install.sh | sudo VERSION=v1.47.0 bash
```

---

## Services

| Unit | Role |
|---|---|
| `hsi-nats` | NATS JetStream message broker |
| `hsi-root-worker` | Privileged filesystem worker (runs as root) |
| `hsi` | Backend API + static file server |

```bash
systemctl status hsi hsi-root-worker hsi-nats
journalctl -u hsi -f
```

---

## Build from source

Requirements: Node.js ≥ 20, pnpm, Go ≥ 1.21, curl, openssl, rsync and an OpenSSH client.

```bash
git clone https://github.com/kittyruntime/home-server-interface
cd home-server-interface
sudo bash scripts/install.sh
```

For a local development environment (dev servers, hot reload, project layout, release process) see [docs/development.md](docs/development.md).

---

## License

Home Server Interface is open-source software licensed under the
[Mozilla Public License 2.0](LICENSE).

You may use, modify, distribute and use the software commercially. Modifications
to files covered by the MPL must remain available under the MPL-2.0.

© 2025–2026 kittyruntime
