---
"@adobe/design-data-wasm": minor
---

Understand any-of in relationship scopes (proposal 017). The solver expands `scope.options.anyOf`
and `{ "anyOf": [...] }` state elements into one candidate per alternative when a recipe is
compiled, so a record can apply to "selected or indeterminate" without duplicates. The compiled
recipe format is unchanged. No data uses an any-of yet.
