---
"@adobe/spectrum-tokens": minor
---

Add opacity + static/neutral transparency tokens and deprecate the legacy tokens they
replace (closes #1344, #1345, #1346, #1347).

- **color-aliases.json**: add an 18-step `opacity-*` foundation scale (`opacity-0`…
  `opacity-1000`).
- **color-palette.json**: add 36 `transparent-static-{white,black}-*` colors built on
  that scale.
- **color-palette.json**: add 36 mode-aware `transparent-neutral[-inverse]-*` colors
  (light/dark/wireframe).
- **color-palette.json**: deprecate 28 legacy tokens (`transparent-white-*`,
  `transparent-black-*`, `white`, `black`), each `renamed` to its `transparent-static-*`
  replacement. Some replacements shift value slightly to align with the new opacity
  scale (flagged for contrast review). `white`/`black` are widely aliased and have no
  consumer audit yet — treat their deprecation as informational pending review.
