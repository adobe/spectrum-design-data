---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Draw the takeover dialog full-screen variant with its background and square corners.

- The layer-2 background records now pin `variant` to `dialog` and `full screen`, so the full-screen
  variant draws its fill. Its dark render no longer shows light text on no fill.
- New corner-radius record for `full screen` bound to `corner-radius-none` (0). The `dialog`
  record points at `corner-radius-800` (16px, the value it resolved to) rather than the size
  `xl` alias, because the render engine drops a size-named token when two records compete for
  one binding.
- Not added: width and height records. React Spectrum and Spectrum Web Components size the
  dialog by the viewport (100%, or 100% minus a 20px margin), not a fixed value, and the
  deprecated `takeover-dialog-width` and `-height` records stay untouched. Padding, gaps and
  title type have no records yet.
- Legacy output is unchanged. The embedded dataset changes, so wasm gets a patch.
