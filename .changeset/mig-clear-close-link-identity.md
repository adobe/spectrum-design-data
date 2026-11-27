---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Migrate the clear-button, close-button and link recipes to structured identity. All three go from
status level 2 to level 3: their 61 recipe bindings select by `property` plus `part` instead of a
`context` label. The relationship records already carried a part, so no relationship record changes.
The legacy `@adobe/spectrum-tokens` output is unchanged.

- clear-button (16 bindings), close-button (30) and link (15): the contexts `Button size`, `Cross
  icon size`, `Cross icon`, `Focus ring`, `Background`, `Button size (down)` and `Text` become
  `part` (container, icon, focus-indicator, text).
- Each selector resolves to the same records as before, so renders are byte-identical and the
  spec sheets are unchanged.
- The status baseline moves the three components to level 3 and the context-selector baseline
  drops their entries.
