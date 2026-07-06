# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

Work this package's `TODO.md` from top to bottom. Keep `README.md` (architecture, for developers and LLMs) and `instructions.md` (end-user docs) in sync with your changes.

## This repo

- **Package id is `lndg`.** LNDg is a Django app; its `settings.py` is composed fresh at every start from a persisted upstream base (`main:./base-settings.py`, written by `init/bootstrapSettings.ts`) plus a StartOS overrides block (`composeOverrides` in `startos/utils.ts`). Python's last-assignment-wins means the overrides shadow the base — that's how `LND_RPC_SERVER`, `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`, and `DATABASES` get set at start without mutating the base file.
- **Hard dependency on LND, reached over the LXC bridge.** `main.ts` resolves LND's gRPC `host:port` through the shared `bridgeAddress` helper in `startos/utils.ts` (mapped from `host.bindings[gRPCPort].net.assignedPort`, so it reacts only to a real port change) and writes it into `LND_RPC_SERVER`. `gRPCHostId`/`gRPCPort` are imported from `lnd-startos/startos/interfaces` — `lnd-startos` is declared as a `github:` source dependency in `package.json`, so the ids stay in sync automatically; don't reintroduce hardcoded `'grpc'`/`10009` literals. LND's `grpc` binding is published only after the first wallet unlock, so the helper resolves `null` until then; main writes the `lndRpcPlaceholder` (`127.0.0.1:10009`) loopback in the meantime and the `.const()` heals on unlock (one restart). It never restarts on LND updates or lock/unlock cycles. TLS is validated against `tls.cert` read off the read-only LND mount at `/mnt/lnd`, whose StartOS-issued cert covers the bridge address.
- **Admin password is action-driven.** It's generated on demand by the `reset-admin-credentials` action; its absence in `store.json` triggers a critical task on init.

## Inspecting a running install

To run a command inside the service's container (read its generated config, grep app logs), use `start-cli package attach lndg -n lndg-main -- <cmd>`. Select the subcontainer by **name** with `-n` (the name passed to `SubContainer.of` in `main.ts` — here `lndg-main`) or by image with `-i`. Note: `-s/--subcontainer` matches the internal **Guid**, not the name, so passing a name to `-s` fails with "no matching subcontainers".
