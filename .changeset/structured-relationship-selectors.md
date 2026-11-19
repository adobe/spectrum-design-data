---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Let a visual recipe name a relationship by its structured identity (spike for proposal 018).
- **Spec:** a recipe `relationship` selector may use `contextRole`, `contextQualifier`,
  `part` and `between` instead of `context`. It matches every record whose fields equal the
  ones given, and SPEC-062 rejects a selector that names more than one identity. Mixing
  `context` with them is invalid. `context` selectors work as before.
- **Data:** the switch and checkbox recipes bind on the structured fields, in 199 and 351
  lines (was 247 and 411). 148 relationship records gain `scope.part` or `scope.between` and
  lose a role or qualifier the part now says. Rendered output and spec sheets are unchanged.
- **Engine:** the renderer, SPEC-062, SPEC-066, SPEC-071, SPEC-090 (a `between` gives the
  label bracket) and the spec-sheet generator read both forms. A WASM build older than
  this one cannot resolve the new recipes.
