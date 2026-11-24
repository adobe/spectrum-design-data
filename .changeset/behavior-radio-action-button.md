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
* Registry: facets `orientation` and `arrowOrder`, and a new
  `environment.json` (`direction`: ltr, rtl, initial ltr) that contracts may
  list in `state` and vectors set in `start`. Radio group now has the role
  `radiogroup` in its accessibility block and its contract.
* Web key bindings for `button` (Enter on key down, Space on key up) and
  `radio` (Space on key up, arrows, no Home or End), with key vectors and
  component vectors. Only radio-group's `accessibility` block changed (role
  `radiogroup`); sheets derived from the contracts equal the block-derived.
* Proposal 022 evidence table: measured button, link and radio keys.
* The component explorer data gains the radio-group role; no render changes.
