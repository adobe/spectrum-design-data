---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": minor
---

Relationships can scope to the place of a repeated item. Part of the 7.0.0 bundle.

- **relationship-format.md, relationship.schema.json**: new `scope.itemPosition` (`first`,
  `middle`, `last`, `only`), counted over the drawn copies like a recipe `when.position`.
  `scope.position` (sides and corners) is unchanged.
- **SPEC-107** (error): `itemPosition` needs a `scope.part` that is the repeated part of a
  collection slot, or a part inside it.
- **@adobe/spectrum-design-data**: list-view's two "Item rounding" records move from
  `options.position` top/bottom to `itemPosition` first/last. Their `legacyKey` pins stay, so the
  legacy tokens are unchanged.
- **@adobe/design-data-wasm**: the engine resolves a record per drawn copy by `itemPosition`
  (one satisfied condition) and refuses `itemPosition` values it does not know. CLI is 0.62.2.
- Dataset `requires.cli` is unchanged: 0.62.2 is untagged and carries this.
