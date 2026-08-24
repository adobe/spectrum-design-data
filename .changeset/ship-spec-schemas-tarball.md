---
"@adobe/design-data-tui": patch
"@adobe/design-data-wasm": patch
---

Ship spec schemas in the GitHub tarball so manifest Layer-1 validation runs (closes bead h890.4).

- **sdk/core/src/data_source/fetch.rs**: `should_extract` now retains
  `packages/design-data-spec/schemas/**`, which was previously dropped during
  tarball extraction of a fetched foundation.
- **sdk/core/src/manifest.rs**: `apply_configured` now errors when a platform
  manifest is configured but `manifest.schema.json` cannot be located, instead of
  silently skipping Layer 1 validation.
- **sdk/core/src/data_source/embedded.rs**: the embedded fallback snapshot (used
  outside a monorepo checkout, with no fetched or local source) now also bakes in
  `manifest.schema.json`, so the new guard above doesn't newly break that path.
