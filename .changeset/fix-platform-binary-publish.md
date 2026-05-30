---
"@adobe/design-data": minor
---

Fix npm release so platform binary packages publish in lockstep with the launcher.

- **.changeset/config.json**: add a `fixed` group locking `@adobe/design-data` and the four
  `@adobe/design-data-{darwin-arm64,darwin-x64,linux-x64,win32-x64}` packages so they always
  version and publish together.
- **.github/workflows/release.yml**: run `pnpm run version` (was `pnpm changeset version`) so the
  Moon step syncs the bumped version into the cli/tui `Cargo.toml` files, and add a pre-publish
  guard that aborts if any platform package version drifts from the CLI.
- This ships the 0.2.x binaries (embedded DB cache, shared manifest resolution) that the 0.2.0
  launcher referenced but never published.
