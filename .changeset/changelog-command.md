---
"@adobe/design-data-wasm": minor
---

feat(cli): `design-data changelog` writes per-component changelogs (hzje.7)

`design-data changelog --from <ref> --to <ref> [--component <id>] [--dataset <path>]` diffs the
dataset between two git revisions, each first-parent commit once for all components, and appends
a release to `<dataset>/changelog/<component>.json`. Releases already recorded are never
rewritten, so a second run changes nothing. It calls `git` as a subprocess and assumes no
monorepo paths, so platform repositories can run it too. `--tags <glob>` cuts a range into one
release per stable tag (backfill), and a component that never changed gets a baseline-only
file at `1.0.0`. `spec-sheet --changelog` reads the new format.
