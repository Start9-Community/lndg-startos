# Carried patches

Deltas applied to the upstream image's `/app` at build time, in filename order, by the
`patch -p1 --fuzz=0` step in the [Dockerfile](../Dockerfile). `--fuzz=0` is deliberate: after an
image bump a patch whose context has changed must fail the build, not apply anyway with the
mismatch ignored.

Each patch is generated against the upstream git tag the image is pinned to
(`images.lndg.source.dockerBuild.buildArgs.IMAGE` in `startos/manifest/index.ts`), and every
LNDg bump has to re-validate it.

## 0001 — remove the LND database size

**Retire when:** upstream reports the size of LND's SQLite database (`data/graph/<network>/lnd.sqlite`
and its siblings) and the image is bumped past it. Tracked upstream at
[cryptosharks131/lndg#471](https://github.com/cryptosharks131/lndg/issues/471); neither `v1.11.1`
(the current pin) nor `master` handles it as of 2026-11-08.

LNDg's home page shows "DB Size", the size of the single file `LND_DATABASE_PATH`
(`data/graph/mainnet/channel.db`). The LND package runs `db.backend=sqlite`, so that file is
either absent or a dead bolt leftover from before the migration, and the number means nothing.
LNDg also no longer mounts the directory it lives in, so the stat would only log an error on every
page load. The patch drops the `node_info` API's `db_size` field, the stat that fills it, and the
home-page element that shows it.
