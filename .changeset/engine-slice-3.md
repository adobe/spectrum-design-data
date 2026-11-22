---
"@adobe/design-data-wasm": patch
"@adobe/spectrum-design-data": patch
---

Recipe renderer: no matching state now falls back to the default record, and a
relationship pinned to a `scale` applies only at that scale.

- Alert banner: the close button end spacing is bound, so the close button sits 8px
  (desktop) or 16px (mobile) in from the end edge instead of flush.
