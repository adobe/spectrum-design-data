---
"@adobe/spectrum-design-data": patch
---

Register `corner-radius` as the canonical property term (unifying the
previously-unregistered `corner-radius` and the single-use `border-radius`
entry) and decompose the last fused `corner-radius-medium` residual (dsi.10).

- **packages/design-data/registry/property-terms.json**: renamed the
  `border-radius` term to `corner-radius` (label + id) to match actual
  token usage; no more unregistered `corner-radius` property.
- **packages/design-data/tokens/layout-component.tokens.json**: migrated
  the one `border-radius` token to `property: corner-radius` (existing
  pinned `legacyKey` keeps serialized output unchanged).
- **packages/design-data/tokens/layout.tokens.json**: decomposed
  `corner-radius-medium` + `state: default` into
  `property: corner-radius`, `state: default`, `size: m`, matching its
  `xl`/`l`/`s` siblings; verified byte-identical via
  `design-data:roundtrip-verify`.
