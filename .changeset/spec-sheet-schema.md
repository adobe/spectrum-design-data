---
"@adobe/design-data-spec": minor
---

feat(spec): draft JSON Schema for the component spec-sheet model

Adds `component-spec-sheet.schema.json`: pages of blocks, one block per relationship context.
A block holds a render request with its scene, token rows with option labels, notes and
change markers. `design-data spec-sheet <component>` generates the model from the recipe,
relationships and scene output.
