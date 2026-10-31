---
"@adobe/design-data-tui": patch
---

Fix `design-data figma export --platform` dropping the other colour-scheme modes of an
overridden token.

- An override record carries `manifest.json` as its file, so the exporter grouped it apart from
  its light and dark siblings and let it replace the whole variable.
- Overrides now group with their foundation siblings; the three iOS seafoam tokens keep their
  dark value.
- Exports without `--platform` are unchanged.
