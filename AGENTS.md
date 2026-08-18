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

- **`SECURE_PROXY_SSL_HEADER` and `USE_X_FORWARDED_HOST` are load-bearing.** StartOS terminates TLS upstream, so without them Django's calculated origin differs from the browser's and **login POSTs 403 on a CSRF origin mismatch** — which presents as a rejected password, not as a proxy problem.
- **Omit `LND_RPC_SERVER` entirely when the address is unresolved.** Writing a placeholder that pretends to be LND hides the failure; leaving the bootstrap seed active makes the dial fail visibly and the `.const()` heals on unlock with one restart.
- **`gRPCHostId`/`gRPCPort` come from `lnd-startos/startos/interfaces`**, declared as a `github:` source dependency in `package.json` — don't reintroduce hardcoded `'grpc'`/`10009` literals.
- **`bootstrapSettings` runs on every init kind, not just install.** The base file is tied to the image version, so a restore from an older backup onto a newer image would otherwise leave a stale base missing fields the new version expects. It calls `initialize.write_settings` directly via `python -c` to skip the script's `initialize_django` phase — migrate/collectstatic/createsuperuser against an ephemeral DB — because only the file is wanted.
- **The admin password is deliberately not seeded.** Its absence in `store.json` is what raises the critical task; seeding a default would silently create an account with a known password.
- **LND's `channel.db` is mounted as well as its credentials**, because LNDg reads it directly for analytics the RPC does not expose.
