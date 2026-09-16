---
"@adobe/spectrum-design-data": minor
---

Add Spectrum Hub guidance content to the guideline corpus.

- **packages/design-data/guidelines**: 47 guidelines now sourced from the
  Spectrum Hub, replacing 14 frozen copies and adding 33 new documents; the
  corpus grows from 25 to 58.
- **tools/spectrum-hub-fetcher**: maps hub paths to guideline categories and
  slugs, drops navigation stubs and duplicate pages, and stages Markdown into
  `docs/s2-docs/`.
- **sdk/core/src/data_source/embedded.rs**: guideline count guard updated to 58.
