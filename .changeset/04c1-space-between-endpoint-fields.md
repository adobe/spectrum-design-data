---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-spec": minor
---

Phase D: register `space-between` property term and paired `from`/`to` endpoint fields.

- **packages/design-data/registry/property-terms.json**: added `space-between` term for
  {a}-to-{b} spacing tokens.
- **packages/design-data/fields/from.json, to.json**: new paired semantic fields modeling a
  space-between token's two endpoints; excluded from legacy-key catalog serialization pending
  a dedicated `naming.rs` branch (04c.2).
- **packages/design-data-spec/schemas/token.schema.json**: declared `from`/`to` on the
  nameObject definition.
- **packages/design-data-spec/rules/rules.yaml**: added SPEC-047 validating `from`/`to` values
  against positions, generic anatomy terms, or the referenced component's declared anatomy.
