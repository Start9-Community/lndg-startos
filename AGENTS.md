# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

**Start every task at the recipe index** — `../start-technologies/projects/start-sdk/docs/src/recipes.md`
(or <https://docs.start9.com/packaging/recipes.html>). It maps an intent ("prompt the user to create
admin credentials", "expose a web UI") to the constructs, the reference pages, and a named production
package to copy. Find the recipe before you read this package's neighbours: a package you reach by
grepping may be non-conformant, and the recipe outranks it.

Freshly scaffolded? Work the
[New Package Checklist](../start-technologies/projects/start-sdk/docs/src/new-package-checklist.md)
(or <https://docs.start9.com/packaging/new-package-checklist.html>) from top to bottom. It is a
guide page, not a file in this repo — read it, don't copy it in.

Keep `README.md` (technical reference for an AI support or administering agent) and
`instructions.md` (end-user docs) in sync with your changes.

**Bugs and feature requests are GitHub issues on this repo** — file them as you find them.
Don't record work in the repo instead: no `TODO.md`, no `NOTES.md`, no `PLAN.md`. What you
verified, tried, and decided belongs in the commit message and the PR body.

## This repo

- **`SECURE_PROXY_SSL_HEADER` is load-bearing.** StartOS terminates TLS upstream, so without it Django's calculated origin differs from the browser's and **login POSTs 403 on a CSRF origin mismatch** — which presents as a rejected password, not as a proxy problem.
- **Don't set `USE_X_FORWARDED_HOST`.** StartOS never sends `X-Forwarded-Host` and does not strip a client's, so the setting lets any client choose the host Django checks the origin against.
- **Don't build `ALLOWED_HOSTS` or `CSRF_TRUSTED_ORIGINS` from the interface's addresses.** Reading them with `.const()` restarts the service every time a gateway gains or loses an address.
- **Keep the daemon's shell wrapper and `runAsInit` together.** The controller has no SIGTERM handler, so alone as PID 1 it ignores the stop signal until the timeout; without `runAsInit` its children outlive it and a restart starts a second set beside them.
- **Keep the `SECRET_KEY` override and the `check_password` guard in `ensure-superuser`.** Upstream's generator makes a new key every init, and an unconditional `set_password` re-salts the hash every start; either one ends every login session.
- **Keep `os.makedirs` for `data/` in the overrides.** Upstream's logging writes there and the image has no such directory, so without it every `manage.py` command dies configuring logging.
- **Omit `LND_RPC_SERVER` entirely when the address is unresolved.** Writing a placeholder that pretends to be LND hides the failure; the `.const()` re-runs `main` once LND publishes one.
- **`gRPCHostId`/`gRPCPort` come from `lnd-startos/startos/interfaces`**, declared as a `github:` source dependency in `package.json` — don't reintroduce hardcoded `'grpc'`/`10009` literals.
- **`bootstrapSettings` runs on every init kind, not just install.** The base file is tied to the image version, so a restore from an older backup onto a newer image would otherwise leave a stale base missing fields the new version expects. It calls `initialize.write_settings` directly via `python -c` to skip the script's `initialize_django` phase — migrate/collectstatic/createsuperuser against an ephemeral DB — because only the file is wanted.
- **The admin password is deliberately not seeded.** Its absence in `store.json` is what raises the critical task; seeding a default would silently create an account with a known password.
- **LND's `channel.db` is mounted as well as its credentials**, because LNDg reads it directly for analytics the RPC does not expose.
