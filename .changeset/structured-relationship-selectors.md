---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Let a visual recipe name a relationship by its structured identity, and add `scope.attribute`
(proposal 018).
- **Spec:** a relationship's identity is `(scope.property, scope.attribute, scope.part,
  scope.between)`. `scope.attribute` is new and optional: a sub-quality of the property
  (`border`, `background`, `dash`, `shadow`, `corner`, `overlay`, `gradient`). It is checked
  against `registry/attributes.json` as a warning (SPEC-101).
- **Spec:** a recipe `relationship` selector may use `attribute`, `part` and `between` instead
  of `context`. It must name `part` or `between`, matches every record whose given fields are
  equal, and SPEC-062 rejects a selector that names more than one identity. Mixing `context`
  with them is invalid.
- **Rules:** SPEC-062's one-identity check is an error where a component has no identity
  collisions, a baselined warning elsewhere. `context` selectors per recipe cannot rise.
- **Data:** the switch and checkbox recipes bind by identity, and 206 relationship records gain
  `scope.part` or `scope.between`. Renders and spec sheets are byte-identical.
  `@adobe/spectrum-tokens` is not affected.
- **Engine:** the renderer, SPEC-062/066/071/090, the status report and the spec-sheet generator
  read both forms. A CLI or WASM build older than this one cannot resolve the new recipes.
- **Release:** the dataset requires CLI 0.57.0; 0.56.0 cannot resolve selectors without `context`.
