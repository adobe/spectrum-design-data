---
"@adobe/design-data-wasm": patch
"@adobe/spectrum-design-data": minor
---

Anatomy review and identity migration of slider, rating and select-box (A8, PR 3 of 3). All three
reach level 2. The legacy `@adobe/spectrum-tokens` output is byte-identical.

- slider: reviewed anatomy with container, field-label, value, control, track, fill, handle,
  number-field and focus-indicator; `text-field` is removed. Options gain `size`, `isEmphasized`,
  `trackStyle` (thin, thick, ramp) and `handleStyle`; `hasGradient` and `progressionScale` are
  removed. Records get parts, size pins and `between`; `component-height-N`,
  `control-to-field-label-*` and `font-size-N` are decomposed.
  The Label font records move to `value`.
- slider: the old `size` values small, medium, large and extra-large stay as deprecated
  values (replaced by s, m, l, xl).
- rating: the star part `indicator` is renamed `icon`; option `size` (s, m) added.
  The `indicator` part is kept as deprecated.
- select-box: state `selected` is removed (the option `isSelected` covers it); the `vertical-` and
  `horizontal-` name prefixes become an `orientation` pin; shadows get `attribute: shadow`.
- Registry: `number-field` anatomy term. Disabled and shadow collisions are resolved by a pin.
  Component-status, recipe-lint and same-pin-set baselines are updated.
