---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Picker: the field background records now say which state they apply to.

- The three gray-200 background records are pinned to the hover state, so the default
  background (gray-100) and the hover background no longer tie when a recipe binds them.
- Picker declares the `down` interaction state, as button and search-field do.
- Legacy `@adobe/spectrum-tokens` output is byte-identical.
