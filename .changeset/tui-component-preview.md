---
"@adobe/design-data-tui": minor
---

Add `:preview <component>`, which draws a component from its visual recipe in the terminal.

- **`:preview button [size=l] [state=hover] [scheme=dark] [scale=mobile]`**: opens an overlay
  with the component drawn in half-block characters, using the same renderer as
  `design-data render --format png`. `c` switches light and dark, `s` the size, `t` the state.
- **Font**: text uses Adobe Clean Spectrum VF when it is installed, and a bundled open font
  otherwise. The footer says which, and points to `design-data fonts` on fallback.
- The first preview loads the recipes lazily, so TUI startup is unchanged.
