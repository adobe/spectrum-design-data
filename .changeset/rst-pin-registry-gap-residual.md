---
"@adobe/spectrum-design-data": patch
---

Pinned `legacyKey` on the 25 remaining registry-gap residual tokens in
`layout.tokens.json` (bead spectrum-design-data-rst). 22 of the 25 are already
deprecated with a `replaced_by` token, so registering new anatomy/qualifier
vocabulary for them was not worthwhile; published legacy names are unaffected.

- **packages/design-data/tokens/layout.tokens.json**: pinned `legacyKey` on
  `android-elevation`, `corner-triangle-icon-size-*` (8),
  `navigational-indicator-top-to-back-icon-*` (8), `side-focus-indicator`,
  and `side-label-character-count-*` (6).
