---
"@adobe/spectrum-design-data": patch
---

Decompose remaining background/opacity fusion residue missed by 284.3
(closes spectrum-design-data-284.6).

- **packages/design-data/tokens/color-aliases.tokens.json**:
  `background-opacity-key-focus` split into `object`/`property`, matching
  the sibling `background-*-opacity` state tokens.
- **packages/design-data/tokens/color-component.tokens.json**:
  `card-background-loading-color`, `table-selected-row-background-opacity`
  (+ hover/non-emphasized variants), `tree-view-row-background-hover`, and
  `tree-view-selected-row-background-{default,hover}` split into
  `object`/`property`, keeping existing `legacyKey` pins.
- `background-base-color`, `background-layer-1-color`/`-2-color`, and
  `stack-item-selected-background-color-highlight` left unsplit — they'd
  need a new registered `variant`/`anatomy` id (`base`, `layer`, `item`)
  that doesn't exist today; that's a registry decision, not a data-only
  change, so out of scope here.
