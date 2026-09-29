---
"@adobe/design-data-spec": minor
---

Add a `prefix` property to manifest `formatting` (closes DNA-1741).

- **manifest.schema.json**: `formatting.prefix` (string) is prepended to a
  formatted name, after casing/delimiter, unaffected by them — for wrapping
  conventions like CSS custom properties (`--spectrum-`).
- **spec/manifest.md**: documents the new field alongside `conceptOrder`,
  `casing`, `delimiter`, `abbreviations`.
