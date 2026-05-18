---
"@adobe/spectrum-tokens": minor
"@adobe/design-system-registry": patch
---

Pilot name-object migration: add structured `name` fields to color palette and
font-weight tokens (closes first phase of taxonomy corpus migration).

- **color-palette.json**: 369 tokens gain `name: { property, colorFamily, scaleIndex? }`.
- **typography.json**: 6 canonical font-weight tokens gain `name: { property, weight }`.
- **design-system-registry**: export the six new taxonomy registries added in #961 via
  the package.json `exports` map; add `propertyTerms` named export to `index.js`.
- **tools/token-corpus-migrate**: new migration tool for injecting name objects;
  run dry-run with `node tools/token-corpus-migrate/src/cli.js --root <tokens-src>`,
  apply with `--write`.
