# Updating the upstream version

LNDg ships from a single source: the upstream-published `ghcr.io/cryptosharks131/lndg` container image, tagged `v<version>` to match the GitHub release.

## Determining the upstream version

- **LNDg** ([cryptosharks131/lndg](https://github.com/cryptosharks131/lndg)) — latest GitHub release:

  ```sh
  gh release view -R cryptosharks131/lndg --json tagName -q .tagName
  ```

  Pinned in `startos/manifest/index.ts` as `images.lndg.source.dockerTag` (`ghcr.io/cryptosharks131/lndg:v<version>`).

## Applying the bump

- **`startos/manifest/index.ts`** — set `images.lndg.source.dockerTag` to `ghcr.io/cryptosharks131/lndg:v<new version>`.
- **`initialize.py` upstream** — the package calls `write_settings` directly (`startos/init/bootstrapSettings.ts`) and appends to the settings it generates (`composeOverrides` in `startos/utils.ts`). Diff the file between the two versions: a changed signature fails every init, and a setting that assumes upstream's Docker layout, such as a path under `data/`, needs an answer in the overrides.
- **`controller.py` upstream** — the daemon command wraps it. Check it still takes `runserver <address>` and still has no SIGTERM handler of its own.
