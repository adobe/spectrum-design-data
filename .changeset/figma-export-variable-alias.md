---
"@adobe/spectrum-design-data": minor
---

The Figma export generator now emits native `VARIABLE_ALIAS` references for
mode values that alias another exported variable, instead of flattening them
to a literal (closes spectrum-design-data-11k.8.3).

- **sdk/core/src/figma/mapping.rs**: `process_color_set_token` and
  `process_scale_set_token` push a `VARIABLE_ALIAS` value when a mode's alias
  target is part of the export run, falling back to today's literal
  flattening only when the target is outside the exported set;
  `resolve_variable_id` is extracted from `make_variable_action` and a
  pre-pass resolves every token's variable id up front so alias targets
  processed later in the token list still resolve; `ExportSummary` gains
  `mode_values_aliased`.
- **sdk/cli/src/main.rs**: `figma export`'s summary line reports how many
  mode values were aliased.
