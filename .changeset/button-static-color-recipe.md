---
"@adobe/spectrum-design-data": patch
---

Fix the Button visual recipe for static color black and white.

- **label/icon**: static colors apply to primary and secondary; accent and negative stay white.
- **accent/negative fill**: backgrounds require `style: fill`, so outline no longer gets a fill.
- **focus ring**: static color uses transparent black or white 1000.
- **disabled**: static color uses overlay 100 fill, 300 border and 400 content.
- **hover/down**: static outline background is overlay 100; static border ignores gray hover.
- **static outline border**: primary 800, secondary 300.
