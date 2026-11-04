---
"@adobe/design-data-wasm": minor
---

feat(sdk): `design-data figma public-names` compares public Figma variable names with design-data

- **design-data figma public-names**: reads a `variables/local` snapshot, pairs each public
  variable with the hidden variable it aliases and the token or relationship record behind it,
  generates the name that record would get, and classes the match (identical, reordered, adds or
  drops words, different, unresolved). Hidden variables without a public alias are listed with a
  generated name. Writes CSV and Markdown reports; designer names are never changed.
