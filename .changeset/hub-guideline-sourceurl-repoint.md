---
"@adobe/spectrum-design-data": minor
---

Retire 9 guideline duplicates already superseded by Spectrum Hub content, and
re-point the 2 remaining frozen sourceUrl fields (closes
spectrum-design-data-085.2.4).

- **packages/design-data/guidelines**: removes `app-frame-content-area`,
  `app-frame-header`, `app-frame-creating-bluelines`,
  `app-frame-side-navigation`, `containers`, `illustrations`,
  `object-styles`, `typography-fundamentals`, and `spacing` — each was a
  frozen `s2.spectrum.corp.adobe.com` copy whose live-Hub successor content
  already exists under a new slug; corpus goes from 58 to 49.
- **packages/design-data/guidelines/introduction.json, principles.json**:
  re-point `sourceUrl` from the frozen S2 site to their live
  `/getting-started/` Hub equivalents.
- **tools/spectrum-hub-fetcher/src/hub-map.js**: add `/getting-started/` to
  `PREFIX_CATEGORIES` (mapped to `fundamentals`) so these pages join the
  automated crawl going forward.
- **sdk/core/src/data_source/embedded.rs**: guideline count guard updated to
  49.
