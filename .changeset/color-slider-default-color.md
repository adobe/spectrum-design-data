---
"@adobe/spectrum-design-data": patch
---

The color slider and color area `color` option defaults to `#3b63fb` (Figma's sample color).
The channel gradient now draws by default instead of a bare checkerboard. The color slider also
declares that each `colorSpace` only has its own channels (`hue` is not an `rgb` channel).
