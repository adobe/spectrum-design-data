---
"@adobe/spectrum-tokens": minor
"@adobe/design-system-registry": patch
---

Typography canonical name-object migration: add `name` fields to remaining
non-alias typography tokens in `typography.json`.

- **font-family tokens** (4): gain `name: { property: "font-family", family }`.
- **font-style tokens** (2): gain `name: { property: "font-style", style }`.
- **font-size scale-set tokens** (18): gain `name: { property: "font-size", scaleIndex }`.
- **line-height scale-set tokens** (18): gain `name: { property: "line-height", scaleIndex }`.
- **design-system-registry**: add `font-style` to `property-terms.json`; add
  `normal` to `typography-styles.json`; update `registry_data.rs`.
- **token-corpus-migrate**: extend with `fontFamilyNameForKey`, `fontStyleNameForKey`,
  `fontSizeNameForKey`, `lineHeightNameForKey` classifiers.
