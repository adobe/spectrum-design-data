---
"@adobe/design-data-tui": patch
"@adobe/design-data-wasm": patch
---

Add `migrate legacy-output-cascaded` for feeding classic-schema consumers (e.g. iOS
tokentool) from a manifest-resolved dataset (h890.10).

- **sdk/cli/src/main.rs**: new `migrate legacy-output-cascaded [PATH] --output FILE`
  applies the configured platform manifest cascade before converting to legacy
  schema, dropping Foundation-layer records shadowed by a Platform-layer override
  so the output is deterministic.
- **sdk/core/src/legacy.rs**: new `convert_records` entry point converts an
  already-cascaded in-memory array; `build_mode_entry`'s `$schema` fallback for
  schema-less override records now matches alias-ness instead of copying an
  unrelated sibling's schema.
