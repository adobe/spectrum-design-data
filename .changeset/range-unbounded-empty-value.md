---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

The behavior runner treats an unset range bound as unbounded and an empty value like React Aria
(decisions A712 b and A713 a).

- An unset `min` or `max` option means no bound on that side: no clamp, snapping from 0 when
  there is no minimum, Home does nothing without a minimum and End nothing without a maximum.
  A page by a fraction and a `move` position need both bounds and change nothing without them;
  `wrap` needs both and fails the vector. A key a block leaves out (Rating's `min`) keeps its
  default.
- With `value` unset, increment goes to the minimum and decrement to the maximum (0 without
  one). Home and End are unchanged.
- The number-field `known limit` vectors are rewritten to this behavior. Rating's two vectors
  that relied on an unset value and an unset `maxValue` follow it.
