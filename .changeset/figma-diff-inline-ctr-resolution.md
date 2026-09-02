---
"@adobe/spectrum-design-data": minor
---

`figma diff`/`figma import` now resolve Component/Token Relationship (CTR)
entries that carry their value inline instead of a `$ref`, recovering 438
`.Platform scale` variables previously reported `figma-only` for lacking a
design-data token (closes spectrum-design-data-11k.10.8).

- **sdk/core/src/graph.rs**: `resolve_relationship_ref` falls back to a new
  `relationship_tokens` index of inline-value CTRs (dimension, multiplier,
  gradient-stop). Scale-set CTRs carry all scale values along, so per-mode
  diffs align to Figma's own mode rather than a hardcoded scale. Inline
  `font-family` CTRs still don't resolve — no comparison rule for them.
- **sdk/core/src/figma/import.rs**: `scale_aligned_source_value` reads the
  new per-scale values directly, since CTR scale-sets never enter
  `set_uuid_index`.
- **sdk/core/src/validate/mod.rs**: reindexes `relationship_tokens` after
  loading a `relationships_path` catalog.
