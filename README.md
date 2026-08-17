<p align="center">
  <img src="icon.png" alt="LNDg Logo" width="21%">
</p>

# LNDg on StartOS

> Everything not listed in this document should behave the same as upstream
> LNDg. If a feature, setting, or behavior is not mentioned here, the upstream
> documentation is accurate and fully applicable — see the Documentation
> section of `instructions.md` for links.

[LNDg](https://github.com/cryptosharks131/lndg) is a web dashboard and automation suite for an LND node: channel management, fee policy, rebalancing, and analytics. This package runs it against the LND on the same server, composing its Django settings fresh at every start so the interface's addresses and LND's location are always current.

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

| Property      | Value                          |
| ------------- | ------------------------------ |
| Image         | `ghcr.io/cryptosharks131/lndg` |
| Architectures | x86_64, aarch64                |
| Command       | The application's controller   |

| Subcontainer              | Purpose                                                |
| ------------------------- | ------------------------------------------------------ |
| `lndg-main`               | Three oneshots and the daemon — the one to `attach` to |
| `lndg-bootstrap-settings` | Temporary, init only: writes the base settings file    |

Three oneshots run before the daemon: database migrations, ensuring the admin account exists, and collecting static assets.

## Volume and Data Layout

One volume, plus a read-only view of LND's.

| Volume            | Mount Point | Purpose                                           |
| ----------------- | ----------- | ------------------------------------------------- |
| `main`            | `/data`     | The database, the base settings, the store        |
| LND's `main` (ro) | `/mnt/lnd`  | LND's certificate, macaroon, and channel database |

| Path               | Written by | Holds                                      |
| ------------------ | ---------- | ------------------------------------------ |
| `db.sqlite3`       | LNDg       | Every setting, policy, and record it keeps |
| `base-settings.py` | Init       | Upstream's canonical Django settings       |
| `store.json`       | Actions    | The admin password                         |

**LND's channel database is mounted too**, not just its credentials — LNDg reads it directly for analytics that the RPC does not expose.

## File Models

Two models, and the more interesting file is the one that is **not** persisted.

| File               | Format | Modelled                  | Written by |
| ------------------ | ------ | ------------------------- | ---------- |
| `base-settings.py` | text   | Yes — `FileHelper.string` | Init       |
| `store.json`       | JSON   | Yes — `FileHelper.json`   | The action |

**The live settings file is composed at every start and never persisted.** It is the persisted base plus a StartOS overrides block, written into the container's own filesystem — Python's last-assignment-wins is what lets the overrides shadow upstream's defaults without editing the base.

What the overrides set, and why each has to be computed rather than stored:

- **The allowed hosts and trusted origins**, from the interface's _current_ addresses. Adding an address and not regenerating these is how a Django app starts rejecting logins.
- **LND's gRPC address**, resolved live.
- **The proxy protocol header**, because StartOS terminates TLS upstream. Without honoring it, Django computes an origin that does not match the browser's and **login POSTs fail with a CSRF origin mismatch** — a failure that looks like a wrong password.
- **The database location**, pointing at the volume rather than the image.

**The base file is rewritten on every init, not just install.** It is tied to the image version, so a restore from an older backup onto a newer image would otherwise leave a stale base missing fields the new version expects.

**LND's address is omitted from the overrides when it does not resolve**, rather than defaulted — the seeded placeholder in the base stays active, the dial fails, and the health check shows it. Writing a placeholder that pretends to be LND would hide the problem.

## Dependencies

One, and it is required.

| Dependency | Required | Health checks required | Mounted                         | Why                 |
| ---------- | -------- | ---------------------- | ------------------------------- | ------------------- |
| LND        | Yes      | `lnd`                  | `main`, read-only at `/mnt/lnd` | The node it manages |

**This package uses LND's admin macaroon.** LNDg opens and closes channels, sets fees, and rebalances — so access to this service is operational control of your node.

LND publishes its gRPC binding only after its wallet has first been unlocked. Until then the address does not resolve and LNDg cannot connect; it heals with one restart when the binding appears, and does **not** restart on LND updates or on later lock and unlock cycles.

The certificate is read from the mount and covers the bridge address LND is dialed at.

## Network Access and Interfaces

One interface.

| Interface | Id   | Type | Port | Description            |
| --------- | ---- | ---- | ---- | ---------------------- |
| Web UI    | `ui` | ui   | 8889 | The LNDg web interface |

Bound on the `ui-multi` MultiHost over HTTP and not masked. LNDg's own Django login gates it.

**Adding a new address requires a restart before it works.** The allowed-hosts and trusted-origins lists are computed at start, so until the service restarts a newly added address is rejected by Django rather than served.

## Installation and First-Run Flow

Install writes the base settings file and seeds the store, then raises a critical task to create the admin credentials — the password is deliberately **not** seeded, because its absence is what raises the task.

Start-up then runs migrations, ensures the admin account matches the stored password, and collects static assets before the daemon starts. The daemon carries a generous grace period because the first start does all three.

**LND must be running and unlocked** for LNDg to show anything. It will start and serve its interface regardless, showing an empty or erroring dashboard until the connection resolves.

## Actions

One action.

### Reset Admin Credentials

Generates the web login password and shows it once. Run it when its task appears, or to recover from a lost password.

- **What it changes:** the password in the store, and the admin account in the application's database on the next start.
- **Cost:** the service restarts, since the account is reconciled by a start-up step rather than live.
- **Repeat safety:** each run generates a **new** password and invalidates the old one.
- **Outputs:** a fixed username and the new password.

## Tasks

One, and it is reactive.

| Task                    | Severity   | Raised when                     | Cleared when    |
| ----------------------- | ---------- | ------------------------------- | --------------- |
| Reset Admin Credentials | `critical` | Any init that finds no password | The action runs |

`critical` blocks the service from starting and suspends the ordinary controls, so a fresh install shows the task and nothing else.

## Health Checks

One check, on the only daemon.

| Check     | Displayed as    | Method                 | Grace |
| --------- | --------------- | ---------------------- | ----- |
| `primary` | "Web Interface" | Port 8889 is listening | 60s   |

It reports that the interface is serving, not that LND is connected. **A green check with an empty dashboard means the LND connection**, and the two causes are LND not yet unlocked and LND's address not yet resolved — both visible in the service logs.

Nothing here reports on LNDg's automation. Whether rebalancing is running and succeeding is visible inside the application.

## Backups and Restore

The `main` volume is copied wholesale — `sdk.Backups.ofVolumes('main')`. That is LNDg's database, the base settings, and the admin password.

The database is where everything the user configures lives — fee policies, rebalancing rules, and the full history LNDg has accumulated — so this backup is the whole of the application's state.

A restored instance comes back with the same password and the same policies. **The base settings file is rewritten on init**, so a restore onto a newer image picks up that version's settings rather than carrying the old one forward, and LND's address is re-resolved on the new server.

## Limitations and Differences

1. **The admin macaroon is required**, so access to this service is operational control of the node.
2. **A newly added address needs a restart** before Django will accept requests on it.
3. **The live settings file is ephemeral** and regenerated each start; editing it inside the container does not survive.
4. **The password can be reset but not chosen**, and resetting restarts the service.
5. **Mainnet only.** The macaroon, channel database, and network are all pinned to Bitcoin mainnet.
6. **LNDg reads LND's channel database directly**, so the two must be on the same server.

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
  - store.json # the admin password
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
```
