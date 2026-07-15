---
"@adobe/spectrum-design-data": minor
---

Register `has-stepper` qualifier + `default-width` property and decompose the
number-field stepper and field default-width tokens (closes spectrum-design-data-dsi.2.1).

- **packages/design-data/registry/{qualifiers,property-terms}.json**: add
  `has-stepper` qualifier and `default-width` property term.
- **packages/design-data/tokens/layout-component.tokens.json**: decompose 4
  `number-field-with-stepper-minimum-width-*` tokens to `qualifier: has-stepper`
  + `property: minimum-width`, pinning `name.legacyKey`; decompose
  `field-default-width-*` to `{component: field, property: default-width, size}`
  (roundtrips clean, no legacyKey needed).
- **tools/token-mapping-analyzer/src/decomposer.js**: register the `with`+
  `stepper` phrase as the `has-stepper` qualifier so the published key still
  decomposes cleanly.
- **sdk/core/src/registry_data.rs**: regenerated from the registry changes.
