---
"@adobe/spectrum-design-data": patch
---

Decompose 8 fused compound-state opacity tokens in `stack-item`/`tree-view`
into structured `name` fields (closes spectrum-design-data-284.5).

- **packages/design-data/tokens/layout-component.tokens.json**: split each
  token's fused `property` string (e.g.
  `stack-item-selected-background-opacity-emphasized-hover`) into
  `component`/`anatomy`/`object`/`property`/`state`/`emphasis`/`qualifier`,
  keeping the existing pinned `legacyKey` unchanged.
