---
"@adobe/design-data-wasm": minor
"@adobe/design-data-spec": patch
---

feat(core): scene token refs carry the relationship that bound them

`TokenRef` gains `relationship` (`uuid`, `context`, `property`) when a value came through a
relationship binding, so overlays name the relationship property, not the token's legacy key.
The spec-sheet `render.measurements` now lists the scene measurements whose relationship
context is the block title, each labelled with the relationship property.
