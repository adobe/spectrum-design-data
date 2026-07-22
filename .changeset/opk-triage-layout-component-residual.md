---
"@adobe/spectrum-design-data": patch
---

Triaged the 114 remaining untracked residual tokens in
`layout-component.tokens.json` (bead spectrum-design-data-opk). No new registry
vocabulary was needed; published legacy names are unaffected.

- **packages/design-data/tokens/layout-component.tokens.json**: pinned
  `legacyKey` on 93 deprecated and idiosyncratic-live tokens, and decomposed 21
  live tokens (popover/media/preview/header minimum/maximum dimensions,
  disclosure-indicator height/width, indicator thickness, corner-radius
  family) into existing property and anatomy terms with `legacyKey` pinned.
- **packages/design-data/components/card.json**: declared the `preview`
  anatomy part used by the decomposed `card-preview-minimum-height` token.
- **packages/design-data/components/tree-view.json**: declared the
  `disclosure-indicator` anatomy part used by the decomposed
  `tree-view-disclosure-indicator-height/width` tokens.
