---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Let a visual recipe name a relationship by its part or its gap (spike for proposal 018).
- **Spec:** a recipe `relationship` selector may use `part` and `between` instead of
  `context`. It must name at least one, matches every record whose given fields are equal,
  and SPEC-062 rejects a selector that names more than one identity. Mixing `context` with
  them is invalid. `context` selectors work as before.
- **Data:** the switch and checkbox recipes bind on `part` or `between`, in 211 and 366
  lines (was 247 and 411). 206 relationship records gain `scope.part` or `scope.between`
  and lose a role or qualifier the part now says. Rendered output and spec sheets are
  unchanged. `@adobe/spectrum-tokens` is not affected.
- **Engine:** the renderer, SPEC-062, SPEC-066, SPEC-071, SPEC-090 (a `between` gives the
  label bracket) and the spec-sheet generator read both forms. A WASM build older than
  this one cannot resolve the new recipes.
