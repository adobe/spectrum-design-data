---
"@adobe/design-data": minor
---

Fix `renamed` reconstruction from array `replaced_by`; add legacy-verify drift guard (#1122).

- **sdk/core/src/legacy.rs** (`normalize_lifecycle_for_legacy`): reconstruct the legacy
  `renamed` field from array-form `replaced_by` — resolve each UUID via the uuid→name
  map; emit `renamed` when all elements collapse to one distinct name. Hoist `renamed`
  to the outer level when per-mode set entries all carry the same value.
- **sdk/cli** (`migrate legacy-verify`): new subcommand regenerates legacy from a cascade
  source dir and semantically compares against a reference legacy dir; non-zero exit on
  differences.
- **packages/tokens** (`verifyLegacyOutput`): new moon task wires `migrate legacy-verify`
  into the `test` dependency graph with cross-package inputs so cascade↔legacy drift is
  caught on any PR that touches either token tree.
