---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": minor
---

Add a meter visual recipe.

- Meter renders size, value (with `minValue` and `maxValue`), the four variants, `hideLabel`, help
  text, and white and black static colors. `labelPosition: side` is not drawn yet.
- Meter anatomy is reviewed and gains a `header` part.
- New options `staticColor`, `labelPosition`, `minValue` and `maxValue`; `value` loses its 0 to 1
  limit. Variant fill colors and static colors are pinned in relationships (new `Control` context).
