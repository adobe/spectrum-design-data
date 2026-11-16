---
"@adobe/design-data-wasm": patch
"@adobe/design-data-spec": patch
---

SVG label text now uses the font stack `'Adobe Clean Spectrum VF', adobe-clean-spectrum-vf,
'Source Sans 3', sans-serif`. Browsers match family names exactly, so the old lead name
`adobe-clean-spectrum-vf` missed an installed Adobe Clean Spectrum VF and fell back to the static
`Adobe Clean`, which is about 18 % wider. A label such as "Save changes" then overran the button's
right padding. The static `Adobe Clean` is no longer in the stack. Layout is still measured with
the Source Sans 3 width table.
