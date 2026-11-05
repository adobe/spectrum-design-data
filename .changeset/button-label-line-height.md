---
"@adobe/spectrum-design-data": patch
---

Button labels now bind the per-size `line-height-font-size-75..300` tokens.

The Button recipe left the label line height unbound, so it rendered at 1.3 times the font size
(23.4 px at XL). New Label relationships and a `lineHeight` binding in the visual recipe give
16/18/20/22 px on desktop, matching Figma and React Spectrum S2.
