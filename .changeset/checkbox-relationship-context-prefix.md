---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-spec": minor
"@adobe/design-data-wasm": minor
---

Recipe lints and fixes for checkbox, switch and others; pressed scale includes nested parts.

- **relationships**: strip the stray "S2 " prefix from contexts; add checkbox `Control`,
  disabled and error contexts; scope selected switch and radio-button records with
  `isSelected: true` (the schema allows boolean option values, the renderer maps them).
- **visuals**: pressed parts scale nested children; checkbox `pressTarget`; `notVisual` option list.
- **validate**: SPEC-066 to SPEC-070 warn on uncovered options and states, token selectors a
  relationship covers, literals, deprecated tokens and focus ring names; SPEC-071 is info.
  `recipe_lint_baseline` holds each recipe at its current warning count.
- **spec**: authoring conventions in `component-visuals.md`; `notVisual` recipe field.
- **sdk/core**: render snapshot test for every recipe; `SceneCache` speeds matrix renders.
- **relationships**: `scope.options` pick a default or the most specific override (arrays allowed);
  badge colors, padding and fonts bind that way, shrinking its recipe by 1,600 lines.
  `scope.options.state` adds states to the bound token.
- **switch**: `isReadOnly` has no distinct visual (hover and press only).
- **button, action-button**: colors, press perspective, hold-icon inset bind via relationships.
- **focus-indicator**: the `focus-ring` anatomy, gap token and recipe parts are now
  `focus-indicator` (legacy key `focus-ring-gap` kept).
