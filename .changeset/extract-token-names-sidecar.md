---
"@adobe/spectrum-tokens": minor
"@adobe/design-data-spec": patch
---

Move token `name` objects out of @adobe/spectrum-tokens into a new private
@adobe/token-names sidecar package.

- **@adobe/spectrum-tokens**: 497 inline `name` objects removed from
  color-palette.json, icons.json, typography.json. Token data otherwise identical.
- **@adobe/token-names** (private, new): sidecar package mirroring tokens/src
  layout; depends on @adobe/spectrum-tokens via workspace:*.
- **sdk/core**: `TokenGraph::from_json_dir_with_names` merges sidecar names at
  ingest; existing rules unchanged. CLI gains `--names-dir` flag.
- **token-corpus-migrate**: writes nameMap to sidecar dir, not inline to tokens.
