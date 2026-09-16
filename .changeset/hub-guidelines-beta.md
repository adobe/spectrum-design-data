---
"@adobe/spectrum-design-data": minor
---

Add Spectrum Hub guidance content to the guideline corpus (beta channel).

- **packages/design-data/guidelines**: 47 guidelines now sourced from the
  Spectrum Hub, replacing 14 frozen copies and adding 33 new documents; the
  corpus grows from 25 to 58. Each carries its live `sourceUrl`, so
  `design-data-guideline` and `design-data-guideline-list` return current
  guidance for color, typography, layout, content/UX writing, inclusivity,
  app frame, object styles, and support topics.
- **tools/spectrum-hub-fetcher**: maps hub paths to guideline categories and
  slugs, drops navigation stubs and duplicate pages, and stages Markdown into
  `docs/s2-docs/`.
- **sdk/core/src/data_source/embedded.rs**: guideline count guard updated to 58.

Published to the npm `beta` dist-tag ahead of the Spectrum Hub's public
announcement. Note that `beta` is a discovery convenience, not access control —
the hub pages this is built from are already served publicly without auth.
