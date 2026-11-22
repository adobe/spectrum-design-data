---
"@adobe/spectrum-design-data": patch
---

Identity migration for clear-button, close-button, link, in-field-progress-circle,
progress-circle and divider. All six reach level 2. The legacy `@adobe/spectrum-tokens` output is
byte-identical. opacity-checkerboard stays at level 1 (it needs an owner decision).

- clear-button and close-button: `component-height-75/100/200/300` becomes `height` on the
  container with a `size` pin. Records get the parts `container`, `icon` and `focus-indicator`.
  Static-color variants share one context per identity, and the close-button background records
  get a `background` attribute.
- link: records move to `text`, `focus-indicator` and `container`. `font-size-100`,
  `line-height-100` and `text-underline-gap` become `font-size`, `line-height` (the CJK record
  pins `script`) and `gap`.
- progress-circle and in-field-progress-circle: records move to `track` and `fill`, and the
  legacy size and thickness records share the context of their siblings.
- divider: records move to `line`, and `horizontal-minimum-width` and `vertical-minimum-height`
  become `minimum-width` and `minimum-height`, with the existing `orientation` pin.
- The six recipes follow the renamed properties and contexts and render byte-identical.
- All record uuids are kept and deprecated records are untouched.
