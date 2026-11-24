---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": minor
---

Add behavior contracts for the display components and harden the runner.

- Runner: a suite now pins its contract's `state` and each part's `role`,
  `focus`, `press` and `handles` (`pins`); a changed focus mode, a dropped
  `isDisabled` or a mistyped role fails. A key step or key suite for a role
  with no binding fails instead of skipping.
- Format: `semantics` may copy an option to an attribute (`copy`, with
  `absentWhen`), and a vector may expect `aria` attributes.
- Data: contracts for Progress bar, Progress circle, In-field progress
  circle and Meter (role, `focus: none`, value attributes, no transitions),
  with vectors. No accessibility block changed; renders and spec sheets are
  unchanged.
