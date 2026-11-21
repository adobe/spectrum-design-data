---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Migrate tabs and segmented-control to level 2 identity (5m92.6).

- Every live record now names a part or a between, so no record is left without structure.
- Fused names become real terms: `font-size-N` to `font-size`, `workflow-icon-size-100` to
  `size` on the icon. Edge spacing becomes `space-between` with start-edge, end-edge,
  top-edge and bottom-edge endpoints; symmetric pairs are two records sharing one `$ref`.
- Colour records get an `attribute` (background or border). No `background-color` or
  `border-color` record is added.
- Records that scale or change by colour scheme carry `scale` and `colorScheme` pins.
- Contexts (and the qualifier that goes with them) were made equal only where two records
  shared one identity. One duplicate segmented-control spacing pair was removed.
- Tab gap records and the compact tab heights now share one identity and context.

Legacy `@adobe/spectrum-tokens` output is byte-identical.
