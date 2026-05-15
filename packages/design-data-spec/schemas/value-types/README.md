# Value-Type Schemas

JSON Schema files under this directory define the shape of token `value` fields for each value-type. They are referenced by the `$valueType` field on tokens and validated by SPEC-016.

## Composite sub-key type annotations (`x-valueType`)

Each property within a composite value-type schema (e.g. typography, drop-shadow) carries an `x-valueType` extension keyword that declares the expected scalar value-type of that sub-value when it is an inline alias reference (`{token-name}`).

* **Type**: string or array of strings. Array form means any of the listed types is acceptable.
* **Recognized scalar type names**: `color`, `dimension`, `number`, `font-family`, `font-weight`.
* **Consumer**: `sdk/core/src/validate/rules/spec015.rs` (SPEC-015 — composite inline alias type compatibility).

Example from `typography.schema.json`:

```json
"fontSize": { "type": "string", "x-valueType": "dimension" },
"lineHeight": { "type": "string", "x-valueType": ["dimension", "number"] }
```

The scalar type names are an interim vocabulary. Once individual primitive value-type schemas exist under this directory (e.g. `dimension.schema.json`), `x-valueType` values will migrate to schema-relative paths matching the `$valueType` convention (e.g. `"value-types/dimension.schema.json"`).
