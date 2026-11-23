---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Fix Button keyboard-focus and outline down colors.

- Keyboard-focus now takes the hover look for secondary and outline buttons: the
  label and icon use `gray-900` (they stayed `gray-800`), and the outline border
  uses `gray-900` (primary) or `gray-400` (secondary).
- Outline buttons get a `gray-100` background on keyboard-focus (it was
  transparent). The visual recipe has a matching `keyboard-focus` fill entry.
  Static outline buttons now draw the static overlay on focus as well.
- The outline `down` background is `gray-100`, the same as hover (it was
  `gray-200`).

Figma draws only Default, Hover and Disabled for Button. React Spectrum S2 and
Spectrum Web Components gen 2 both give hover, pressed and focus the same colors.
