---
"@adobe/design-data-wasm": patch
"@adobe/spectrum-design-data": patch
---

Migrate field-label and help-text to level 2 identity and `typeStyle` recipes (5m92.6.1).

- Both components reach level 2. Fused names become real terms: `component-height-N` to
  `minimum-height`, `workflow-icon-size-N` to `size` on the icon, the asterisk, edge and alert
  icon gaps to `space-between` with `between` endpoints and a size pin. Every uuid is kept.
- The 13 font records per component become four `type-style` records (composite
  `component-{size}-regular`) plus the two line-height records, renamed to `line-height` with a
  part (the x1.3 overrides stay). The font-style record is dropped.
- help-text's three `content-color` records get distinct parts (text, icon, container) so they no
  longer collide. field-label's white and black colour records are told apart by a new
  `staticColor` option pin.
- The recipes bind `typeStyle`; rendered geometry and values are unchanged.
- `requires.cli` is raised to 0.60.0.

Legacy `@adobe/spectrum-tokens` output is byte-identical.
