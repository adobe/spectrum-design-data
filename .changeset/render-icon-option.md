---
"@adobe/design-data-wasm": minor
---

`renderScene` and `renderSvg` accept `request.icon`, next to `label`.

* `{ set, name }` replaces the icon of every recipe part marked `content: true`.
* `"none"` removes it where the part is also `optional: true` (a label-only Button).
* `"none"` on a required icon keeps the recipe's icon and adds a diagnostic.
* An icon missing from the catalog draws the placeholder with a diagnostic.

The visual runtime's `renderScene(compiled, req, icons)` takes the drawings it can draw for
`req.icon` as a third argument.
