---
"@adobe/spectrum-design-data": patch
---

Identity migration for drop-zone, illustrated-message, coach-mark and contextual-help. All four
reach level 2. The legacy `@adobe/spectrum-tokens` output is byte-identical.

- drop-zone: fused banner and title properties (`component-height-300`,
  `component-edge-to-text-300`, `component-bottom-to-text-300`, `font-size-300`,
  `line-height-100`) become `height`, `padding-horizontal`, `padding-vertical`, `font-size` and
  `line-height`, with `scale` pins. The part-less `font-family` record moves to `title`. Color
  records split into `background` and `border` attributes. The two opacity records share the
  context of their sibling.
- illustrated-message: `line-height-200` becomes `line-height`.
- coach-mark and contextual-help: part-less `spacing` records move to the root part `container`.
  Color records get a `background` attribute.
- All record uuids are kept and deprecated records are untouched.
