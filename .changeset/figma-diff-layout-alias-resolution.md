---
"@adobe/spectrum-design-data": minor
---

`figma diff` now resolves variables whose own name can't invert to a legacy
key but which are themselves a Figma alias into a resolvable variable,
recovering the `Layout` collection and more of `S2.Color-theme` (closes
spectrum-design-data-11k.10.4).

- **sdk/core/src/figma/import.rs**: new `resolve_alias_target` fallback in
  `diff_values` follows a `VARIABLE_ALIAS` to its target and inverts the
  target's name when the variable's own name doesn't resolve, turning ~586
  `figma-only` variables into `match`/`value-mismatch` (all 329 `Layout`
  variables, plus previously-uncovered `S2.Color-theme`/`.Platform
  scale`/`Iconography` variables) without a per-collection override table.
