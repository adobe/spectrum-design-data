---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": minor
---

A nested recipe part's `with` entry can map a host option value to a nested value.
Part of the 7.0.0 bundle.

- **component-visuals.md, component-visual.schema.json**: a third `with` form,
  `{"option": "<host option>", "map": {"<host value as string>": "<nested value>"}}`, next to the
  literal and `{option}` forms. Booleans key as `"true"`/`"false"`.
- **SPEC-089** (error) now checks the form: the host option exists, every key is a value of it,
  every mapped value is valid for the nested option. No new rule.
- **@adobe/spectrum-design-data**: text-field, text-area, combo-box and picker draw their help text
  from `isError` (`true` is `negative`, `false` is `neutral`).
- **@adobe/design-data-wasm**: the engine resolves the map. A host value with no key keeps the
  nested option's default and adds a scene diagnostic (a warning, not an error). CLI is 0.62.2.
- Dataset `requires.cli` is unchanged: 0.62.2 is untagged and carries this.
