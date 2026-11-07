---
"@adobe/spectrum-design-data": patch
---

Action button, badge, checkbox, radio button and switch labels now bind line-height tokens.

These recipes left the label line height unbound, so it rendered at 1.3 times the font size.
New Label relationships (desktop and mobile, per size) and a `lineHeight` binding in each recipe
give the Figma and React Spectrum S2 line heights. SPEC-087 now passes on desktop for all five.
