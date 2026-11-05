---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-spec": minor
"@adobe/design-data-wasm": patch
---

Add an `icons/` catalog with Spectrum 2 icon path data from React Spectrum.

- `icons/ui.json` holds the 11 S2 UI icons with every size drawing (for example
  `chevron` at 50, 75, 100, 200, 300 and 400). `icons/workflow.json` holds five demo
  workflow icons: add, edit, delete, settings and search.
- Paths carry no colour. Each set records the source commit, file names, licence
  (Apache-2.0) and copyright.
- The spec adds `icon-set.schema.json` and registers `icons/` as an optional dataset
  directory, so `validate-dataset` checks it.
- The WASM package embeds both sets in its dataset (about 38 KB raw, 12 KB gzip).
  Recipes do not use them yet.
