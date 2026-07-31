---
"@adobe/spectrum-design-data": patch
---

Backfill the `deprecated: "unknown"` migration placeholder with the real `@adobe/spectrum-tokens`
release version each token was deprecated in (closes spectrum-design-data-3xf). Legacy output is
unchanged — `deprecated` stays truthy either way.

- **packages/design-data/tokens/\*.tokens.json** (7 of 8 files): 1,323 tokens' deprecation
  version replaced `"unknown"` with the release version recovered from
  `packages/tokens/CHANGELOG.md`'s "Newly Deprecated" history (1,242 tokens) or git
  archaeology on `packages/tokens/src/*.json` (81 tokens).
- **packages/design-data/scripts/backfill-deprecated-versions.js**: new re-runnable recovery script
  documenting the two-source resolution method.
