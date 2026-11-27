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
- Not modeled on purpose: width and height. Figma shows both variants filling the parent (dialog is
  the viewport minus the 40px margin, full screen is the viewport), so there is no fixed size to
  record. The deprecated `takeover-dialog-width` and `-height` records are untouched.
- Not drawn (literals only, no records): margin (no recipe prop), overlay (Figma 0.44), padding 32,
  container gap 32, header gap 24, button-group gap 8, title 22 bold. The recipe's title and button
  gap differ from Figma: title 22 bold vs 14 regular, gap 8 vs `spacing-200`, which renders 12.
- Spec sheet: the dialog radius row loses its "Extra Large" label (same 16px value) and the
  background rows lose their variant condition.
- Legacy output is unchanged. The embedded dataset changes, so wasm gets a patch.
