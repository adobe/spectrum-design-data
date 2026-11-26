---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Move the Switch, Checkbox, Radio button, Button, Action button, Close button, Clear button,
In-field button, Link and Swatch recipes from option names to behavior facets in their `when`
clauses (`disabled`, `selected`, `checked`, `pending`, and the `hovered`, `pressed` and
`focusVisible` interaction facets). Every rendered SVG and PNG, spec sheet and the legacy
`@adobe/spectrum-tokens` output are unchanged.

The recipes need an engine that reads facet clauses: CLI 0.63.7 or later, the first to load
contracts in wasm, the MCP server and the TUI preview (already the `requires.cli` of the dataset).
An older TUI build, which is not checked against `requires.cli`, may draw these components'
previews wrongly (a state or option clause that never matches).

Not converted: Checkbox `isSelected` (its `checked` facet also fixes `isIndeterminate`),
and the `orientation` clauses of Button group, Checkbox group and Radio group (SPEC-066 does not
yet read facet clauses and would warn that the option is unused).
