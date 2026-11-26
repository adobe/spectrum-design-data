---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Add behavior contracts for Slider, Color slider and Rating on the range runner.

- Each is a single-thumb `range` contract with role `slider`: arrows step, PageUp and PageDown
  page (a tenth of the span), Home and End set the bounds, a drag is `move` with a position.
  Right to left swaps ArrowLeft and ArrowRight from `direction` only, so orientation does not
  change the arrow order. `isDisabled` ignores every value intent.
- Semantics expose `aria-valuenow`, `aria-valuemin`, `aria-valuemax` and `aria-orientation`
  (Rating: value and `aria-valuemax` only; its minimum 0 is the ARIA default).
- Slider gains an `orientation` option (horizontal or vertical, as on Color slider). Rating
  gains a `maxValue` option (default 5), because a range names its maximum as an option.
- A component suite per contract plus a shared `slider` web key suite. Spec sheets gain the
  new option rows and the value keyboard-intent rows for the three components. No render change.
- Two thumbs (`isRange`) and read-only are not modeled. The embedded dataset changes, so wasm
  gets a patch.
