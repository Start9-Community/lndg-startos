# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

Work this package's `TODO.md` from top to bottom. Keep `README.md` (technical reference for an AI support or administering agent) and `instructions.md` (end-user docs) in sync with your changes.

## This repo

- **`SECURE_PROXY_SSL_HEADER` and `USE_X_FORWARDED_HOST` are load-bearing.** StartOS terminates TLS upstream, so without them Django's calculated origin differs from the browser's and **login POSTs 403 on a CSRF origin mismatch** — which presents as a rejected password, not as a proxy problem.
- **Omit `LND_RPC_SERVER` entirely when the address is unresolved.** Writing a placeholder that pretends to be LND hides the failure; leaving the bootstrap seed active makes the dial fail visibly and the `.const()` heals on unlock with one restart.
- **`gRPCHostId`/`gRPCPort` come from `lnd-startos/startos/interfaces`**, declared as a `github:` source dependency in `package.json` — don't reintroduce hardcoded `'grpc'`/`10009` literals.
- **`bootstrapSettings` runs on every init kind, not just install.** The base file is tied to the image version, so a restore from an older backup onto a newer image would otherwise leave a stale base missing fields the new version expects. It calls `initialize.write_settings` directly via `python -c` to skip the script's `initialize_django` phase — migrate/collectstatic/createsuperuser against an ephemeral DB — because only the file is wanted.
- **The admin password is deliberately not seeded.** Its absence in `store.json` is what raises the critical task; seeding a default would silently create an account with a known password.
- **LND's `channel.db` is mounted as well as its credentials**, because LNDg reads it directly for analytics the RPC does not expose.
