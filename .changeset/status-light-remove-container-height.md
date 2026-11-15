---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": minor
---

Remove the `status-light` "Height", "Spacing (top/bottom edge to label)" and
"Spacing (top edge to dot)" relationships (20 records). They described a 32px
control container with 7px of block padding, carried over from the deprecated
`status-light-top-to-dot-*` tokens. Both the official S2 - Web Figma file and
React Spectrum S2 render Status light as one text line (18px at M) with no
minimum height or block padding. A recipe should size it from the label line
height and place the dot by centring on the first line.
