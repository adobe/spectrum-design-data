---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Let a visual recipe name a relationship by its structured identity (spike for proposal 018).
- **Spec:** a recipe `relationship` selector may use `contextRole`, `contextQualifier`,
  `part` and `between` instead of `context`. It matches the record whose fields equal
  these exactly. Mixing `context` with them is invalid. `context` selectors work as before.
- **Data:** the switch and checkbox recipes bind on the structured fields. 62 relationship
  records gain `scope.part` (handle, track, box) or `scope.between` (the two spacing pairs).
  Rendered output and spec sheets are unchanged.
- **Engine:** the renderer, SPEC-062, SPEC-066, SPEC-071 and the spec-sheet generator read
  both forms. A WASM build older than this one cannot resolve the new recipes.
