---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Add the visual recipes for drop-zone and select-box.

- drop-zone: a dashed container (the stroke reads the dash length and gap relationship records),
  corner radius, padding, width, border color, the illustration image fill, title and description.
  The component gains `title` and `description` string options. The gap between illustration and
  title reads its relationship record. The `s`, `m` and `l` sizes render identically today (no
  size-varying tokens).
- select-box: a vertical or horizontal card with corner radius, padding, background (and the
  disabled background), the hover, keyboard-focus and rest shadows, the down press scale, the
  illustration image fill and the label. The illustration part is present unless
  `hideIllustration` is set.
- Description font-size records for drop-zone name the token of their own scale, as the
  illustrated-message title records do.
- Not drawn yet: the drag-and-drop border and background (the 10% background cannot be drawn: no
  fill alpha), the replace banner and action button, a disabled drop zone, the select-box selected
  border (two records resolve to different colors), checkbox, description and focus ring, and the
  illustration itself (no size record).
- Legacy output is unchanged; the embedded dataset changes, so wasm gets a patch.
