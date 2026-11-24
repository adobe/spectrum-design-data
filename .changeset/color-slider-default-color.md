---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

The color slider and color area default to Figma's default variants, so they draw a gradient
instead of a bare checkerboard or an empty square.

- **color-slider**: `color` `#3b63fb`, `channel` blue and `label` Blue. `colorSpace` has no default: the
  space follows the channel and the color. It declares that each `colorSpace` only has its own
  channels (`hue` is not an `rgb` channel), and lists the spaces as hsl, hsb, rgb.
- **color-area**: `color` `#ff0000`, `xChannel` saturation, `yChannel` brightness and
  `colorSpace` hsb, which is Figma's red square.
