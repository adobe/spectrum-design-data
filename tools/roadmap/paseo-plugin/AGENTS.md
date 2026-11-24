<!-- Copyright 2026 Adobe. All rights reserved. -->

# Beads roadmap Paseo plugin

Read-only Paseo screen over `bd list --all --json`. See [../README.md](../README.md).

* Typecheck: `npm run typecheck` (this folder uses npm and its own lockfile, not the pnpm workspace).
* After editing, run `paseo plugin reload beads-roadmap`; never restart the daemon.
* `shared/roadmap.ts` holds the ordering logic. The standalone `../roadmap.mjs` has its own copy; keep them in step.
