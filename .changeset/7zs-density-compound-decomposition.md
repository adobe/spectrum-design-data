---
"@adobe/spectrum-design-data": minor
---

Decompose density-compound `property` slugs into the atomic `density` (and
co-occurring `size`/`space-between`) fields (closes spectrum-design-data-7zs).

- **packages/design-data/tokens/layout-component.tokens.json**,
  **layout.tokens.json**: migrate 71 tokens whose `property` baked in
  `compact`/`spacious` (e.g. `height-compact`, `spacing-spacious`) into
  `density` plus the already-registered `size`/`space-between` fields, via
  `tools/token-mapping-analyzer/src/apply.js --field density`. Data-only —
  no Rust or tooling changes required; the density field, registry, and
  `naming.rs` roundtrip already existed.
