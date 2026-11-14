---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Add `repeat` to visual recipes: a recipe can draw its root once per entry of an
array option, stacked in a column. The accordion recipe repeats its item over
`items`, so a render can show several items with their own titles and open state
(`isExpanded`, `hasSwitch`, `hasActionButton`). A request without `items` renders
exactly as before.
