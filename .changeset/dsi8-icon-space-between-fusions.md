---
"@adobe/spectrum-design-data": patch
---

Structured fused `-to-` spacing tokens in `layout.tokens.json` into the `name`
object (bead spectrum-design-data-dsi.8). Published legacy names are
unaffected since each migrated token's `legacyKey` pins the flat output name.

- **packages/design-data/registry/icon-terms.json**: registered `alert` and
  `validation` icon ids so icon-family space-between endpoints resolve.
- **packages/design-data/tokens/layout.tokens.json**: 48 tokens migrated to
  `{property:"space-between", from, to, icon?}` shape; 29 idiosyncratic
  tokens hand-authored with a pinned `legacyKey`; additional `structure`,
  `size`, `variant`, `qualifier` fields extracted where safe.
- **packages/design-data/tokens/layout-component.tokens.json**: 41 tokens
  migrated to the `space-between` shape (fix applies corpus-wide, not just
  this bead's file).
- **packages/design-data/tokens/color-aliases.tokens.json**: `variant`
  extracted from fused property strings (e.g. `informative`, `negative`)
  on keyboard-focus color-scheme tokens.
