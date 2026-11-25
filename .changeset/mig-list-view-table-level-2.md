---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Migrate list-view and table relationship records to structured identity. Both components move from
status level 1 to level 2 (neither has a recipe, so level 3 does not apply). The legacy
`@adobe/spectrum-tokens` output and every rendered SVG are unchanged.

- 149 live records get a `scope.part` from the components' anatomy, and fused names decompose:
  `component-edge-to-text-100`, `component-top-to-text-100` and similar become `space-between`
  with a `between`; `font-size-100` becomes `font-size` (with a `size` pin in table);
  `row-height` becomes `height` on its part.
- Identity collisions (6 in list-view, 8 in table) are cleared by giving each colliding identity
  one context and, in table, by a `density` pin on three checkbox spacing records. No uuid,
  `legacyKey`, `$ref` or `contextRole` change; deprecated records are untouched.
- The list-view and table spec sheets regroup, and three duplicate `base-padding-vertical-medium`
  rows (same token and value) collapse; the other 90 sheets are unchanged.
