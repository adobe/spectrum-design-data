---
"@adobe/design-data-spec": minor
"@adobe/design-data-wasm": patch
---

The behavior runner supports ranges keyed by axis and wrapping ranges (decisions A660, A661, A662).

- A contract may declare `ranges` (one `range` block per axis, for color-area `x` and `y`) instead
  of `range`. `do.adjust` takes an `axis`, or else the `axis` of the vector step; a `move` carries
  one axis and one `position`.
- `wrap: true` on a block makes a cycle (color-wheel hue 0 to 360): a step or page step reduces
  into `[min, max)`, so 359 up is 0 and 0 down is 359. `to: max` and a `move` to 1 reach max;
  `to: min` and `to: max` never wrap. Snap, clamp, decimals and emit-only-on-change are as before.
- A missing, unknown or conflicting axis, and a wrap span that is not a multiple of the step,
  fail the vector. SPEC-119 warns on `range` with `ranges`, two axes with one value option, an
  `adjust` axis the `ranges` do not list, and `wrap` without `min` and `max`.
- No component has an axis or wrap contract yet.
