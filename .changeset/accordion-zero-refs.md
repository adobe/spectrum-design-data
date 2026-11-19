---
"@adobe/spectrum-design-data": patch
---

Stop four live accordion relationship records from pointing at deprecated legacy records.

- The `divider` "between accordion item and divider" and `content` "end edges to content" spacing
  records carry an inline `0px` instead of a `$ref` to the deprecated `accordion-item-to-divider`
  and `accordion-edge-to-text` records.
- The `content` "Expanded (content area top/bottom to text)" record now references
  `container-padding-extra-small` (8px). Its twin, which carried the legacy mobile 10px, is removed
  because it would repeat the first record. Figma Web POC has no mobile mode or 10px padding there.
