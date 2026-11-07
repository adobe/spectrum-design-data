---
"@adobe/design-data-wasm": minor
---

Visual renderer measures label text with a font table instead of a flat 0.46 em per character.

The default table is Source Sans 3 (SIL OFL): glyph advances and pair kerning at weights 400
and 700, with 500 and 600 interpolated. Labels are about 4 to 6.6% wider than React Spectrum S2
at weight 700 (S2 uses Adobe Clean, a different font); container widths follow, heights do not
change. Characters outside ASCII measure 0.46 em. `Dataset.renderScene`, `renderSvg` and
`renderScene` in the site runtime accept a `textMetrics` table in the request to replace the
default; a malformed table throws an error that names the problem.
