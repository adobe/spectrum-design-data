# ios-override-importer

## 0.1.0

### Minor Changes

- [#1424](https://github.com/adobe/spectrum-design-data/pull/1424) [`e6bf0af`](https://github.com/adobe/spectrum-design-data/commit/e6bf0afa14c8f6583d200440098678cff8629693) Thanks [@GarthDB](https://github.com/GarthDB)! - Emit the platform manifest's `extensions/` directory layout instead of an inline
  `extensions` object, matching the Layer 1 schema change (closes spectrum-design-data-h890.26.5).
  - **src/cli.js**: writes net-new extension tokens to `extensions/tokens/imported.tokens.json`
    instead of an inline `manifest.extensions` object; `formatting` moves to a top-level field.
    A re-run producing zero extension tokens removes a stale fragment left by a prior run.
  - **src/emit-manifest.js**: extension token records use `$valueType:
"value-types/color.schema.json"` instead of the now-rejected `$schema` key.
  - **src/parse-colorset.js**: normalizes rgba alpha (`1.0` → `1`) to satisfy the color value-type's
    pattern.
  - **src/resolve-target.js**: palette-slug names now include `property: "color"` and a string
    `scaleIndex`, satisfying `token.schema.json`'s name-object validation.
