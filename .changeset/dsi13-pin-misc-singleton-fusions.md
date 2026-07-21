---
"@adobe/spectrum-design-data": patch
---

Structured 14 untracked fused-property singleton tokens into the `name`
object (bead spectrum-design-data-dsi.13). Published legacy names are
unaffected since each token's `legacyKey` pins the flat output name.

- **packages/design-data/tokens/color-aliases.tokens.json**: extracted
  `structure`/`emphasis`/`state` from the two `drop-shadow-emphasized(-hover)-key-color`
  families (6 tokens); extracted `object` (`focus-indicator`/`title`/`track`)
  and `variant`/`colorFamily` where applicable from 5 generic-alias singletons
  previously fused as `*-color`.
- **packages/design-data/tokens/color-palette.tokens.json**: extracted
  `component:"avatar"` from the 3 `gradient-stop-N-avatar` tokens.
- **packages/design-data/tokens/color-component.tokens.json**: pinned
  `legacyKey` on the 3 `opacity-checkerboard` `square-dark` tokens (verified
  the light/dark/wireframe `colorScheme` mismatch flagged in the bead is a
  naming artifact — "dark" names the darker of two alternating tiles, not the
  color scheme — no value change).
- **packages/design-data/tokens/typography.tokens.json**: pinned `legacyKey`
  on `default-font-family` (no registered segment to extract).
