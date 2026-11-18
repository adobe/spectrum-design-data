---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-spec": minor
"@adobe/design-data-wasm": minor
---

Add a progress-circle visual recipe, and a `sweep` prop so a `progress` part draws an arc.

- New `progress` props: `strokeWidth` (ring thickness, a ninth of the diameter when unbound) and
  `sweep` (share of the ring, 0 to 1, usually a `fraction`). The arc starts at 12 o'clock and runs
  clockwise. No `sweep` still draws the fixed quarter-arc frame, so button spinners are unchanged.
- Progress circle renders size, value, indeterminate (one fixed frame) and white and black static
  colors, all bound through relationships. Anatomy is reviewed.
- Removed the `variant` option ("over background"), which is Spectrum 1 only. Added `staticColor`
  (white, black); its static records pin it and the indicator ones now use `content-color`.
