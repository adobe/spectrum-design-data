---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Add the behavior contracts for Color wheel and Color area on the range runner, covered by intent.

- Color wheel: one `range` with `wrap` over the hue 0 to 360 (`minValue`, `maxValue`, `step`), a
  page of 15 degrees, no right-to-left mirror (React Aria; Spectrum Web Components flips the
  arrows). `value`, `minValue` and `maxValue` are `aria-valuenow`, `aria-valuemin` and
  `aria-valuemax` on the `color-handle`. Steps give 0 to 359; 360 only from `set-max` or a drag to the end.
- Color area: two axes, `x` and `y`, in `ranges` (`x-value`, `y-value` and their bounds, one
  `step`), no wrap, a page of a tenth of each span. Every intent names its `axis`, a drag is one
  `move` per axis. No `semantics`: one contract cannot name two `aria-valuenow`.
- `isDisabled` ignores every value intent. An unset value reads the minimum on a step.
- Component suites only. The `color-handle` has focus `tab-stop` and no `role`, so no web key suite runs
  (decision A662: a `slider` role would run the shared slider suite). Spec sheets gain the
  keyboard-intent rows. No render change. The embedded dataset changes, so wasm gets a patch.
