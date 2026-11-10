<!-- Copyright 2026 Adobe. All rights reserved. -->

# sdk/plugins/site/controls

Build script and pinned lockfile for the Spectrum Web Components bundle in `../assets/`.

* **Audience:** consumer. **Lifecycle:** active. **npm:** not published.
* `entry.js` lists the components to bundle; `package.json` and `pnpm-lock.yaml` pin every dependency, including transitive ones. This directory is not a pnpm workspace member and the root `pnpm-lock.yaml` must not change.
* `build.sh` writes `../assets/spectrum-controls.js` and `../assets/THIRD-PARTY-NOTICES.txt` (built from the esbuild metafile by `notices.mjs`). Rebuilding with the committed lockfile is byte-identical.
* To change versions, edit `package.json`, run `UPDATE_LOCK=1 sh build.sh`, and commit the lockfile, bundle and notices together.
* Repository-wide rules are in [the root AGENTS.md](../../../../AGENTS.md). The [repository index](../../../../docs/repo-index.md) lists every project.

## Commands

```bash
sh sdk/plugins/site/controls/build.sh
```
