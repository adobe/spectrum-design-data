---
"@adobe/design-data-tui": patch
---

Stop embedding the legacy `packages/tokens/manifest.json` in the SDK (closes xqln.19).

- **sdk/core**: remove the embedded `TOKENS_MANIFEST` and `ResolvedData.manifest`.
- **sdk/core**: bump the embedded snapshot marker so stale snapshots re-extract.
