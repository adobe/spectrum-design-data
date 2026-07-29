---
"@adobe/spectrum-design-data": patch
---

Decompose 81 fused position/size/state tokens into structured `name` fields
(closes spectrum-design-data-284.2).

- **packages/design-data/tokens/layout-component.tokens.json**: split 70
  tokens' fused `property` strings (e.g. `default-width`, `cjk-size-l`,
  `handle-large`, `steplist-step-default-height-large`) into
  `property`/`size`/`state`/`anatomy`/`density`/`script`, keeping each
  token's pinned or newly-reconstructed `legacyKey` unchanged.
- **packages/design-data/tokens/layout.tokens.json**: split 7
  `base-padding-horizontal-uniform-*` tokens into `property`/`orientation`/
  `shape`/`size`.
- **packages/design-data/tokens/typography.tokens.json**: split 4
  `margin-{top,bottom}-multiplier` tokens (detail, heading) into
  `property`/`position`.
- Triaged 22 genuinely ambiguous tokens without forcing a naming call:
  `side-focus-indicator`, `default-font-family`, 15 `component-*` typography
  tokens, and 5 `collection-card-minimum-height-hero-*` tokens (no
  registered `hero` variant id).
