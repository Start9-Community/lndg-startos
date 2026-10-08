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
`instructions.md` (end-user docs) in sync with your changes. This file restates neither:
whoever changes the package has both, so it carries only what they don't — repo mechanics,
a change that looks right and is not, where the next thing gets added, a naming trap, a
build or test invocation particular to this repo.

**Fix a defect you spot rather than reporting it** — you have the package open and the
context to be sure. File **a GitHub issue on this repo** only when the call isn't yours to
make: you can't pin the cause down, two defensible fixes exist, or it's too large to ride on
the work in hand. An open issue is a report, not a queue — implement one when you're asked
to or when it's labelled `Approved`, then close it with `Closes #<n>`.

Don't record work in the repo instead: no `TODO.md`, no `NOTES.md`, no `PLAN.md`. What you
verified, tried, and decided belongs in the commit message and the PR body.

## This repo

- **Keep every line of the settings overrides block and the `check_password` guard in `ensure-superuser`.** Each looks removable and is not: without `SECURE_PROXY_SSL_HEADER` logins fail with a CSRF 403 that reads as a wrong password, without the `SECRET_KEY` override or with an unconditional `set_password` every login session ends, and without `os.makedirs` for `data/` every `manage.py` command dies configuring logging.
- **Don't set `USE_X_FORWARDED_HOST`, and don't build `ALLOWED_HOSTS` or `CSRF_TRUSTED_ORIGINS` from the interface's addresses.** StartOS does not strip a client's `X-Forwarded-Host`, and a `.const()` read of the addresses restarts the service whenever a gateway gains or loses one.
- **Keep the daemon's shell wrapper and `runAsInit` together.** The controller has no SIGTERM handler, so alone as PID 1 it ignores the stop signal until the timeout; without `runAsInit` its children outlive it and a restart starts a second set beside them.
- **Import `gRPCHostId`/`gRPCPort` from `lnd-startos/startos/interfaces`** (a `github:` dependency in `package.json`); don't reintroduce `'grpc'`/`10009` literals.
