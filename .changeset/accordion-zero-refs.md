---
"@adobe/spectrum-design-data": patch
---

Stop two live accordion relationship records from pointing at deprecated legacy records. The
`divider` "between accordion item and divider" and `content` "end edges to content" spacing
records now carry an inline `0px` value instead of a `$ref` to the deprecated
`accordion-item-to-divider` and `accordion-edge-to-text` records. Resolved values do not change.
