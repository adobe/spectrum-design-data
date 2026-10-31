---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-spec": minor
"@adobe/design-data-wasm": minor
---

Recipe lints and fixes for checkbox, switch and others; pressed scale includes nested parts.

- **relationships**: strip the stray "S2 " prefix from contexts; add checkbox `Control`,
  disabled and error contexts; scope selected switch and radio-button records with
  `isSelected: true` (the schema allows boolean option values, the renderer maps them).
- **sdk/core, site runtime**: a pressed part's nested children scale with it.
- **visuals**: checkbox `pressTarget` is `control`; `notVisual` lists options with no look.
- **validate**: SPEC-066 to SPEC-070 warn on uncovered options and states, token selectors a
  relationship covers, literals, deprecated tokens and focus ring names; SPEC-071 is info.
  `recipe_lint_baseline` holds each recipe at its current warning count.
- **spec**: authoring conventions in `component-visuals.md`; `notVisual` recipe field.
- **switch**: document that `isReadOnly` has no distinct visual (hover and press only).
