---
"ios-override-importer": minor
---

Emit the platform manifest's `extensions/` directory layout instead of an inline
`extensions` object, matching the Layer 1 schema change (closes spectrum-design-data-h890.26.5).

- **src/cli.js**: writes net-new extension tokens to `extensions/tokens/imported.tokens.json`
  instead of an inline `manifest.extensions` object; `formatting` moves to a top-level field.
- **src/emit-manifest.js**: extension token records use `$valueType:
  "value-types/color.schema.json"` instead of the now-rejected `$schema` key.
- **src/parse-colorset.js**: normalizes rgba alpha (`1.0` → `1`) to satisfy the color value-type's
  pattern.
- **src/resolve-target.js**: palette-slug names now include `property: "color"` and a string
  `scaleIndex`, satisfying `token.schema.json`'s name-object validation.
