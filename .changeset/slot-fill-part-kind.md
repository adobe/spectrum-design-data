---
"@adobe/design-data-spec": minor
"@adobe/spectrum-component-api-schemas": major
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": minor
"@adobe/design-data": minor
---

BREAKING: accordion drops the `hasActionButton` and `hasSwitch` options; slot fills replace them.

- **Migrate** a consumer that passed `hasActionButton` or `hasSwitch` (or the same keys on
  `items[]`) to fill the `actions` slot: a render request `slots: {"actions": [{"component":
  "action-button"}, {"component": "switch"}]}`. The CLI takes `--slots <json>`, a batch state takes
  `slots`. Fills are the same for every item of the accordion.
- **Spec**: a new `slot` recipe part kind draws a request's fills through the nested-component path.
  Fills past the slot's `max`, or outside its `accepts`, are scene diagnostics, never a failure. An
  optional `placeholder` literal (with a required `reason`) draws an empty slot. New rule SPEC-108.
- **Data**: accordion loses the two options, their `items[]` copies and the `action-button` and
  `switch` parts; its `actions` part draws the slot. The "section title to action area" spacing
  record is scoped by `between` (title, actions) instead of `part: header`.
- **Layout revision 6**: the accordion snapshot option sets changed. Renders with fills are
  unchanged apart from the part ids (`actions-1`, `actions-2`, replacing `action-button`, `switch`).
- **Engine**: `RenderRequest` gains `slots`; older engines ignore it and draw no fills.
