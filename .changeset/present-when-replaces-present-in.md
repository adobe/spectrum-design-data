---
"@adobe/design-data-spec": major
"@adobe/spectrum-design-data": major
"@adobe/design-data-wasm": minor
"@adobe/design-data": minor
---

BREAKING: `presentWhen` replaces `presentIn` on anatomy parts (spec 7.0.0).

- **Migrate** `presentIn: ["keyboard-focus"]` to `presentWhen: {"states": ["keyboard-focus"]}`.
  A part shown while an option is set takes `presentWhen: {"options": {"isSelected": true}}`. The
  key holds only `states` and `options`; `position` and `modes` fail the schema.
- **ANY-of became ALL-of**: `presentIn` drew a part when any listed state was active, `states` needs
  every listed state. Do not copy a multi-state `presentIn` over: `selected-keyboard-focus`
  implies `keyboard-focus`, so stack-item takes `states: ["keyboard-focus"]`.
- **Recipes**: `visibleWhen` keeps only `position`. Its `states` and `options` move to the anatomy
  part of the same name, and the renderer applies both (anatomy `presentWhen` and recipe position).
- **Rules**: SPEC-075 is removed. SPEC-074 (`anatomy-present-when-declared`) now covers the whole
  condition: declared states, declared options, allowed values.
- **@adobe/spectrum-design-data**: 42 `presentIn` keys became `presentWhen`, and 62 recipe
  conditions on 78 parts moved into 47 components. Renders are unchanged.
- **CLI 0.63.0**: older CLIs read no presence condition and draw every part, so the dataset
  `requires.cli` is raised to 0.63.0. `presentIn` and recipe `states` and `options` are not read.
