---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Add the behavior contract for Number field on the range runner.

- Role `spinbutton` on the `field` part (a tab stop). ArrowUp and PageUp `increment`, ArrowDown
  and PageDown `decrement`, Home `set-min`, End `set-max`, all on key down. A page is one `step`,
  not a fraction of the span. ArrowLeft and ArrowRight are not bound: they move the caret.
- The `in-field-button` part (the stepper buttons) has focus `none`, so it is not in the tab order.
- `value`, `minValue` and `maxValue` are exposed as `aria-valuenow`, `aria-valuemin` and
  `aria-valuemax`; `aria-valuenow` is absent while `value` is unset. `isDisabled` ignores every
  value intent. An unset `minValue` or `maxValue` is unbounded and an unset
  `value` follows React Aria (see range-unbounded-empty-value).
- A component suite and a web `spinbutton` key suite. Spec sheets gain the number field value
  keyboard-intent rows. No render change. Read-only, hold to repeat, wheel, IME and number
  formatting are not modeled. The embedded dataset changes, so wasm gets a patch.
