---
"@adobe/spectrum-design-data": minor
---

The Figma export generator can now export from a manifest-resolved dataset
instead of a raw token-source directory (closes spectrum-design-data-h890.11).

- **sdk/core/src/figma/mapping.rs**: `build_export_payload` takes a
  `tokens: &[(String, Value)]` slice instead of a token-source directory
  path; `load_all_tokens` is now `pub` so callers load tokens themselves
  before building the payload.
- **sdk/cli/src/main.rs**: `figma export` gains a `--manifest <PATH>` flag;
  when given, tokens are resolved through the platform manifest cascade
  (include/exclude, overrides, extensions) before export instead of reading
  `path` as a raw token directory. Behavior without `--manifest` is unchanged.
