---
"@adobe/spectrum-design-data": minor
---

Register color/layout/qualifier vocab and migrate affected tokens per
proposal 006 (closes spectrum-design-data-dsi.2.5).

- **packages/design-data/fields/qualifier.json**, **registry/qualifiers.json**:
  new `qualifier` name-object field (`stacked`, `multiline`, `precision`,
  `collapsed`, `expanded`, `drag`, `highlight`).
- **registry/{variants,positions,anatomy-terms,sizes,property-terms,shapes,
  structures}.json**: register `subtle`/`subdued`, `inner`/`outer`/`below`,
  `pagination`/`row`/`slash`/`square`/`well`/`indicator`/`layer`/`track`/
  `underline`, `xxxxl`, `opacity`/`minimum`/`minimum-padding-vertical`/
  `component-size-minimum-perspective`, `rectangle`, `drop-target`.
- **tools/token-mapping-analyzer/src/decomposer.js**: register two compound
  property terms; drop `inner`/`outer` from `KNOWN_GAP_TERMS`.
- **packages/design-data-spec/schemas/token.schema.json**: list `qualifier`
  explicitly in `$defs.nameObject.properties`.
- **packages/design-data/tokens/{color-aliases,semantic-color-palette,
  color-component,layout-component,layout,typography}.tokens.json**: migrate
  affected tokens into structured fields, pinning `name.legacyKey` on each.
