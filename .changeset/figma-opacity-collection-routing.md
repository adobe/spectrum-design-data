---
"@adobe/spectrum-design-data": minor
---

Route opacity tokens to the `.Color theme` collection in the Figma variables
exporter and diff (they were misrouted to `.Platform scale` despite being a
FLOAT), and resolve `S2.Color-theme`'s bare-named alias variables through
their `.Color theme` targets instead of reporting them `figma-only`
(closes DNA-1953).

- **sdk/core/src/figma/mapping.rs**: opacity tokens now route to `.Color
  theme` (`colorTheme/*`) in both the alias-target pre-pass and the flat-token
  dispatch; `process_color_set_token`'s FLOAT/COLOR type inference now checks
  all `sets` members instead of only the first.
- **sdk/core/src/figma/import.rs**: `diff_values` now falls back to
  `resolve_alias_target` for bare (slash-less) Figma names, recovering all 35
  `S2.Color-theme` opacity variables as matches.
