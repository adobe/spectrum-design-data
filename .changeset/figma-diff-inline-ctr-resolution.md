---
"@adobe/spectrum-design-data": minor
---

`figma diff`/`figma import` now resolve Component/Token Relationship (CTR)
entries that carry their value inline instead of a `$ref`, recovering 438
`.Platform scale` variables previously reported `figma-only` for lacking a
design-data token (closes spectrum-design-data-11k.10.8).

- **sdk/core/src/graph.rs**: `resolve_relationship_ref` now falls back to a
  new `relationship_tokens` index of inline-value CTRs (dimension,
  multiplier, gradient-stop schemas), preferring the `scale: "desktop"`
  entry when a scale-set CTR shares one `legacyKey` across scales. Inline
  `font-family` CTRs (e.g. `code-font-family`) still don't resolve — no
  schema-driven comparison rule exists for them.
