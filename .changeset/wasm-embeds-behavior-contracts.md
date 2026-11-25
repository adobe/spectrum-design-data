---
"@adobe/design-data-wasm": minor
---

Embed the behavior contracts and patterns in the dataset, so a recipe that reads `facets` resolves.

- `Dataset.embedded()` now carries `behaviors/*.json` and `behaviors/patterns/*.json` next to
  the recipes, as `design-data render` loads them. No recipe reads `facets` yet, so no render
  changes.
- The package grows by about 17 KB raw and 1.8 KB gzip (the embed's marginal cost).
