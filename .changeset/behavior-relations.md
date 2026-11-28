---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Behavior contracts can name another element with `relations`.

- **design-data-spec**: `behavior.schema.json` gains `relations` (`from`, `kind`, `to`,
  optional `when`) and a `relations` expectation in a vector. An end is an anatomy part or
  an external role. `kind` is `labelledby` or `describedby`.
- **design-data-spec**: new rule SPEC-126 (`behavior-relations-well-formed`, warning), the
  Relations section of the behavior contract spec, and `relation-roles.json` in the
  registry docs.
- **spectrum-design-data**: new registry `relation-roles.json` (`trigger`, `owner`,
  `label`, `description`). Tooltip declares that the trigger's `aria-describedby` refers
  to the container while it is open.
- **design-data-wasm**: the embedded registries and contracts carry the new data; the
  validator reports SPEC-126 and the behavior runner asserts relations.
