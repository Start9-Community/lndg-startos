<p align="center">
  <img src="icon.png" alt="LNDg Logo" width="21%">
</p>

# LNDg on StartOS

> Everything not listed in this document should behave the same as upstream
> LNDg. If a feature, setting, or behavior is not mentioned here, the upstream
> documentation is accurate and fully applicable — see the Documentation
> section of `instructions.md` for links.

[LNDg](https://github.com/cryptosharks131/lndg) is a web dashboard and automation suite for an LND node: channel management, fee policy, rebalancing, and analytics. This package runs it against the LND on the same server, composing its Django settings fresh at every start so LND's location is always current.

- **Upstream repo:** <https://github.com/cryptosharks131/lndg>
- **Wrapper repo:** <https://github.com/Start9-Community/lndg-startos>

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

One upstream image, consumed unmodified.

| Property      | Value                                                                  |
| ------------- | ---------------------------------------------------------------------- |
| Image         | `ghcr.io/cryptosharks131/lndg`                                         |
| Architectures | x86_64, aarch64                                                        |
| Command       | The application's controller, under a shell wrapper that runs as PID 1 |

| Subcontainer              | Purpose                                                |
| ------------------------- | ------------------------------------------------------ |
| `lndg-main`               | Three oneshots and the daemon — the one to `attach` to |
| `lndg-bootstrap-settings` | Temporary, init only: writes the base settings file    |

Three oneshots run before the daemon: database migrations, ensuring the admin account exists, and collecting static assets.

The controller is upstream's own supervisor: it runs the web server and four background jobs as child processes and restarts any that dies, logging `[Controller] - Process <name> died` when it does. The wrapper makes it the container's init, so stopping the service stops every one of those processes, and a controller that dies takes them with it and is replaced as a whole set.

## Volume and Data Layout

One volume, plus a read-only view of LND's.

| Volume            | Mount Point | Purpose                                           |
| ----------------- | ----------- | ------------------------------------------------- |
| `main`            | `/data`     | The database, the base settings, the store        |
| LND's `main` (ro) | `/mnt/lnd`  | LND's certificate, macaroon, and channel database |

| Path               | Written by          | Holds                                      |
| ------------------ | ------------------- | ------------------------------------------ |
| `db.sqlite3`       | LNDg                | Every setting, policy, and record it keeps |
| `base-settings.py` | Init                | Upstream's canonical Django settings       |
| `store.json`       | Init and the action | The admin password and Django's secret key |

**LND's channel database is mounted too**, not just its credentials — LNDg reads it directly for analytics that the RPC does not expose.

## File Models

Two models, and the more interesting file is the one that is **not** persisted.

| File               | Format | Modelled                  | Written by          |
| ------------------ | ------ | ------------------------- | ------------------- |
| `base-settings.py` | text   | Yes — `FileHelper.string` | Init                |
| `store.json`       | JSON   | Yes — `FileHelper.json`   | Init and the action |

**The live settings file is composed at every start and never persisted.** It is the persisted base plus a StartOS overrides block, written into the container's own filesystem — Python's last-assignment-wins is what lets the overrides shadow upstream's defaults without editing the base.

What the overrides do, and why:

- **LND's gRPC address**, resolved live.
- **Django's secret key**, kept in the store. Upstream's generator makes a new one every time the base file is rewritten, which would end every login session on each update, reboot, and container rebuild.
- **The proxy protocol header**, because StartOS terminates TLS upstream. Without honoring it, Django computes an origin that does not match the browser's and **login POSTs fail with a CSRF origin mismatch** — a failure that looks like a wrong password.
- **The database location**, pointing at the volume rather than the image.
- **The log directory**, created beside the application. Upstream writes log files under `data/`, which its Docker setup mounts and the image does not contain; LNDg's own Logs page reads them.

**The base file is rewritten on every init, not just install.** It is tied to the image version, so a restore from an older backup onto a newer image would otherwise leave a stale base missing fields the new version expects.

**LND's address is omitted from the overrides when it does not resolve**, rather than defaulted, so nothing in the settings pretends to be LND. It does not resolve until LND has been unlocked for the first time, and until then LNDg cannot start at all — see Dependencies.

## Dependencies

One, and it is required.

| Dependency | Required | Health checks required | Mounted                         | Why                 |
| ---------- | -------- | ---------------------- | ------------------------------- | ------------------- |
| LND        | Yes      | `lnd`                  | `main`, read-only at `/mnt/lnd` | The node it manages |

**This package uses LND's admin macaroon.** LNDg opens and closes channels, sets fees, and rebalances — so access to this service is operational control of your node.

LND creates its admin macaroon and publishes its gRPC binding only once its wallet has first been unlocked. **Until then LNDg cannot start:** it reads that macaroon as it starts, so its migration step fails with a `FileNotFoundError` naming `admin.macaroon`, and StartOS retries the step until the macaroon exists. After that LNDg does **not** restart on LND updates or on later lock and unlock cycles.

The certificate is read from the mount and covers the bridge address LND is dialed at.

## Network Access and Interfaces

One interface.

| Interface | Id   | Type | Port | Description            |
| --------- | ---- | ---- | ---- | ---------------------- |
| Web UI    | `ui` | ui   | 8889 | The LNDg web interface |

Bound on the `ui-multi` MultiHost over HTTP and not masked. LNDg's own Django login gates it.

**Django accepts any `Host`**, which is upstream's default, so an address added or removed in StartOS takes effect without a restart. Logins pass the CSRF check on every address because the browser's origin is compared with the request's own host and forwarded scheme.

## Installation and First-Run Flow

Install writes the base settings file and seeds the store, then raises a critical task to create the admin credentials — the password is deliberately **not** seeded, because its absence is what raises the task.

Start-up then runs migrations, ensures the admin account matches the stored password, and collects static assets before the daemon starts. The daemon carries a generous grace period because the first start does all three.

**LND must be running and unlocked** for LNDg to show anything. Once LND has been unlocked for the first time, LNDg starts and serves its interface whether or not LND is up, showing an empty or erroring dashboard until the connection resolves.

## Actions

One action.

### Reset Admin Credentials

Generates the web login password and shows it once. Run it when its task appears, or to recover from a lost password.

- **What it changes:** the password in the store, and the admin account in the application's database on the next start.
- **Cost:** the service restarts, since the account is reconciled by a start-up step rather than live.
- **Repeat safety:** each run generates a **new** password and invalidates the old one, along with every open login session.
- **Outputs:** a fixed username and the new password.

## Tasks

One, and it is reactive.

| Task                    | Severity   | Raised when                     | Cleared when    |
| ----------------------- | ---------- | ------------------------------- | --------------- |
| Reset Admin Credentials | `critical` | Any init that finds no password | The action runs |

`critical` blocks the service from starting and suspends the ordinary controls, so a fresh install shows the task and nothing else.

## Health Checks

Two checks: one on the daemon, one on its connection to LND.

| Check            | Displayed as     | Method                                                                        | Grace |
| ---------------- | ---------------- | ----------------------------------------------------------------------------- | ----- |
| `primary`        | "Web Interface"  | Port 8889 is listening                                                        | 60s   |
| `lnd-connection` | "LND Connection" | A `GetInfo` call to LND with the address, certificate, and macaroon LNDg uses | None  |

**Web Interface** reports only that the interface is serving. **LND Connection** is the one that says whether LNDg can do anything: it polls once a minute, and every ten seconds while failing, and its failure message carries the error the attempt gave. Neither check runs until LNDg has started: a service stuck starting with `admin.macaroon` in its log is the case described under Dependencies.

Nothing here reports on LNDg's automation. Whether rebalancing is running and succeeding is visible inside the application.

## Backups and Restore

The `main` volume is copied wholesale — `sdk.Backups.ofVolumes('main')`. That is LNDg's database, the base settings, and the store.

The database is where everything the user configures lives — fee policies, rebalancing rules, and the full history LNDg has accumulated — so this backup is the whole of the application's state.

A restored instance comes back with the same password and the same policies. **The base settings file is rewritten on init**, so a restore onto a newer image picks up that version's settings rather than carrying the old one forward, and LND's address is re-resolved on the new server.

## Limitations and Differences

1. **The admin macaroon is required**, so access to this service is operational control of the node.
2. **The live settings file is ephemeral** and regenerated each start; editing it inside the container does not survive.
3. **The password can be reset but not chosen**, and resetting restarts the service.
4. **Mainnet only.** The macaroon, channel database, and network are all pinned to Bitcoin mainnet.
5. **LNDg reads LND's channel database directly**, so the two must be on the same server.
6. **LNDg's log files are not kept.** They live in the container's own filesystem and start empty at every start, so LNDg's Logs page shows the current run only. The StartOS log keeps the history.

---

## Quick Reference for AI Consumers

```yaml
package_id: lndg
image: ghcr.io/cryptosharks131/lndg
architectures:
  - x86_64
  - aarch64
subcontainers:
  - lndg-main # three oneshots and the daemon
  - lndg-bootstrap-settings # temporary, init only
volumes:
  main: /data # LND's main volume is mounted read-only at /mnt/lnd
file_models:
  - base-settings.py # upstream's canonical settings, rewritten every init
  - store.json # the admin password and Django's secret key
  # the live settings.py is composed at each start into the container, not persisted
startos_managed_env_vars: [] # settings are composed into settings.py
dependencies:
  - lnd # required, kind: running, admin macaroon + channel.db via a read-only mount
interfaces:
  ui: { type: ui, port: 8889 }
actions:
  - reset-admin-credentials
tasks:
  - { action: reset-admin-credentials, severity: critical } # reactive
health_checks:
  - primary # displayed "Web Interface"; says nothing about the LND connection
  - lnd-connection # displayed "LND Connection"; a GetInfo call to LND
```
