---
"@adobe/spectrum-design-data": patch
---

Move the status-light, toast and alert-banner visual recipes to `typeStyle`.

- Text parts bind `type-style` instead of font-family, font-weight and font-size.
- Removed the unused font-family, font-weight, font-style and font-size
  relationship records of those text parts. Line-height records stay.
- Geometry, fills and font attributes render identically.
- The SVG `data-tokens` label now names the type style (for example
  `component-m-regular` instead of `font-size-100`).
