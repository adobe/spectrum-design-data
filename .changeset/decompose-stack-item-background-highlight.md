---
"@adobe/spectrum-design-data": patch
---

Decompose the last remaining fused `name.property`: the stack-item selected/highlight
background-color token (closes spectrum-design-data-284). Legacy output is unchanged
(`legacyKey` pinned).

- **packages/design-data/tokens/color-aliases.tokens.json**: split
  `stack-item-selected-background-color-highlight`'s fused `stack-item-background-color`
  property into `object:"background"` + `property:"color"`. The `stack-item` prefix isn't
  reintroduced as a `component` field — the legacy reference data for this cross-component
  alias never tagged it with one, so `legacyKey` is the only place it's preserved.
