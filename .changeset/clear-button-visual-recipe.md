---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": minor
---

Add a clear-button component and its visual recipe. The clear button is the icon-only control that
clears or removes a value, such as the remove control on a tag. It is not the in-field button.

- Declares `size` (s, m, l, xl), `staticColor` (white) and `isDisabled`. Anatomy (container, icon,
  focus-indicator) is a draft until the owner reviews it.
- The recipe draws a round, transparent button, as React Spectrum does: 24, 32, 40 and 48 px
  squares with an 8, 8, 10 and 12 px cross. Hover, down, keyboard focus, disabled and static white
  change the cross color or add the focus ring.
- Relationships reuse the close-button size, content color and focus ring tokens. The cross size
  tokens are deprecated with no replacement, so the recipe has 8 SPEC-069 warnings (baselined).
