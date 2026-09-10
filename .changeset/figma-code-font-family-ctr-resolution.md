---
"@adobe/spectrum-design-data": patch
---

Resolve the remaining code-font `figma_only` entries in `figma diff` (closes #11k.10.12).

- **sdk/core/src/graph.rs**: added `font-family.json` to `INLINE_CTR_COMPARABLE_SCHEMAS`
  so the inline `code-font-family` CTR resolves, letting `Code/Font family`,
  `platformScale/code-cjk-font-family`, and `platformScale/code-font-family` match
  against their Figma STRING values instead of showing as `figma_only`.
