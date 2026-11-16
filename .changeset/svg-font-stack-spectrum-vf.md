---
"@adobe/design-data-wasm": minor
"@adobe/design-data-mcp": patch
"@adobe/design-data-spec": patch
---

SVG label text now uses the font stack `'Adobe Clean Spectrum VF', adobe-clean-spectrum-vf,
'Adobe Clean', 'Source Sans 3', sans-serif`. Browsers match family names exactly, so the old lead
name `adobe-clean-spectrum-vf` missed an installed Adobe Clean Spectrum VF and the label fell to the
generic sans-serif, about 18 % wider: "Save changes" (700, 16 px) measured 106.73 px against 90.39 px
and overran the button's right padding.

`renderComponentSvg(request, fonts?)` takes the same font list as `renderComponentPng` and sizes the
layout with the first non-fallback font. `design-data-render` passes the installed
Adobe Clean Spectrum VF when it finds one, so SVG boxes fit the text a viewer with that font draws. Without it
the Source Sans 3 table is used, as before.
