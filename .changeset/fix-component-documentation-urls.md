---
"@adobe/spectrum-design-data": patch
---

Fix placeholder documentationUrls on 17 new components (fixes Deploy Docs).

- **packages/design-data/components/**: set per-component documentationUrl
  (page/<name>/) on the 17 components added in #1266 so component slugs are
  unique and match filename stems.
