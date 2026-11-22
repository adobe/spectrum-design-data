---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Identity migration for opacity-checkerboard. It reaches level 2 (and its recipe selectors carry no
`context`, so the status check also reads level 3). The legacy `@adobe/spectrum-tokens` output is
byte-identical. Recipe snapshots and goldens pass unchanged; the standalone checkerboard
render now draws its pattern.

- New anatomy parts `light-tile` and `dark-tile` (new registry terms) model the two alternating
  tiles; `square` keeps the size and now contains both. No tone option, no renamed terms.
- The `square-light` and `square-dark` properties become `color` on `light-tile` and `dark-tile`.
  Records keep their uuids and legacy keys. Deprecated records are untouched.
- The 4 non-legacy color records get a `background` attribute (interim): without it the recipe finds
  no relationship. `render --strict` still reports `patternFill` and `patternSize` as ambiguous
  (main already failed --strict on these recipes); the unlabelled size records get the `Square size`
  context their siblings already carry.
- The recipe binds `fill` to the light tile and `patternFill` to the dark tile by part, not by
  context. `square` joins the relationship contexts registry.
- tree-view and thumbnail records that restate these tokens are not part of this change.
