---
"@adobe/spectrum-design-data": patch
---

Split state/anatomy/emphasis fields out of 20 fused `property` values in
`color-component.tokens.json` (dsi.11).

- **packages/design-data/tokens/color-component.tokens.json**: 20 tokens across
  select-box, stack-item, swatch, table, and tree-view had `property` strings
  that duplicated the component name and fused state (`selected`/`disabled`,
  optionally compounded with `hover`/`down`/`key-focus`/`default`), anatomy
  (`row`/`icon`), and emphasis (`emphasized`/`non-emphasized`) together. Each
  component places these modifiers in its own legacy order (state can lead or
  sit mid-key, not just trail), so `serialize()` can't reconstruct the
  original key from split fields — `legacyKey` pins the exact original string
  per the a9t precedent (`d9bdf1c4`). `design-data migrate legacy-verify`
  confirms byte-identical legacy output.
