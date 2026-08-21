---
"@adobe/design-data-tui": patch
"@adobe/design-data-wasm": patch
---

Add `migrate legacy-output-cascaded` for feeding classic-schema consumers (e.g. iOS
tokentool) from a manifest-resolved dataset (h890.10).

- **sdk/core/src/graph.rs**: `apply_platform_manifest` overrides now replace the
  targeted Foundation-layer record in place instead of shadowing it under a
  synthetic key, so every graph consumer (not just this new command) sees one
  deterministic record per token.
- **sdk/cli/src/main.rs**: new `migrate legacy-output-cascaded [PATH] --output FILE`
  applies the configured platform manifest cascade before converting to legacy
  schema.
- **sdk/core/src/legacy.rs**: new `convert_records` entry point converts an
  already-cascaded in-memory array; `build_mode_entry`'s `$schema` fallback for
  schema-less override records now matches alias-ness instead of copying an
  unrelated sibling's schema, and no longer matches the token being processed.
