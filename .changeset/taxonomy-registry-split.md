---
"@adobe/design-system-registry": minor
"@adobe/design-data-spec": minor
---

Add taxonomy registries and expand token name object schema.

- Split `anatomy-terms.json`: removed styling surfaces and positional terms
- Added `token-objects.json` (background, border, edge, visual, content)
- Added 6 new taxonomy registries: structures, substructures, orientations, positions, densities, shapes
- Exported all 7 new registries from package index
- Added all 13 semantic fields explicitly to `nameObject` in `token.schema.json` with descriptions distinguishing semantic fields from dimension fields
