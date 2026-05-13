---
"@adobe/spectrum-component-api-schemas": minor
"@adobe/design-data-spec": minor
---

feat(component-schemas): migrate source of truth to design-data-spec components

`@adobe/spectrum-component-api-schemas` is now a thin adapter over
`@adobe/design-data-spec/components/`. All 80 component declarations have been
converted to the new format and live in `packages/design-data-spec/components/`.

The API surface is unchanged: `getAllSchemas()`, `getAllSlugs()`,
`getSchemaBySlug()`, `getSchemaFile()`, and `schemaFileNames` all behave
identically. Returned objects now include new fields (`name`, `displayName`,
`options`, `states`, `lifecycle`) alongside the existing aliases (`title`,
`properties`, `slug`) — no consumer breakage.

`@adobe/design-data-spec` minor: 79 component declarations added to
`components/`. `optionDescriptor` in `component.schema.json` now allows
additional JSON Schema keywords (`pattern`, `minimum`, `items`, etc.)
to accommodate real-world component option descriptors.
