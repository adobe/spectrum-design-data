---
"@adobe/design-data-spec": patch
---

Spec sheet Keyboard table lists the keys of the web key bindings, not the registry defaults.

- **sdk/plugins/spec-sheet**: for a contract whose part role the web bindings list, the table keeps
  an intent only when a binding gives it a key, and shows those keys. Checkbox, switch and radio
  button show Space only, link shows Enter only, number-field shows PageUp and PageDown and no
  ArrowRight or ArrowLeft, slider, color slider and rating gain Page and Home/End keys.
- **sdk/plugins/spec-sheet**: color wheel and color area (no part role) drop the page and min/max
  rows that had an empty Keys cell. A contract with no bound role keeps the default keys.
- **sdk/cli**: the spec-sheet graph loads `behaviors/bindings`.
- **packages/design-data-spec/spec/accessibility.md**: documents the rule.
