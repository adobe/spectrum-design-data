---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": minor
---

Add behavior contracts for Radio button, Radio group and Action button, and
the shared `press` pattern (proposal 022).

* Data: `behaviors/patterns/press.json` (extends `interactive`; `disabled`
  facet, `activate` emits `press`) is the base of Action button.
  `radio-button.json` selects on `activate` and when arrow navigation lands
  on it; `radio-group.json` carries `orientation`, `direction` and the
  `arrowOrder` facet (Left and Right swap only when horizontal and rtl).
* Registry: facets `orientation` and `arrowOrder`. `direction` is an
  environment property a contract may list in `state` and a vector set.
* Web key bindings for `button` (Enter on key down, Space on key up) and
  `radio` (Space on key up, arrows, no Home or End), with key vectors and
  component vectors. The `accessibility` blocks are unchanged and the spec
  sheets derived from the contracts equal them.
* Proposal 022 evidence table: measured button, link and radio keys.
* No render or spec sheet changes.
