---
"@adobe/spectrum-design-data": minor
---

Populate documentBlocks on all 68 component JSON files from s2-docs source.

- **packages/design-data/components/*.json**: Add `documentBlocks` to all 68
  components — typed blocks (purpose, guideline, do-dont) from docs/s2-docs/. 67 of
  68 have a leading `purpose` block seeded from the component's `description` field.
  Remaining flags listed in document-blocks-review.md.
- **docs/s2-docs/components/inputs/color-handle.md**: Replace stub with full
  scraped content (Overview, Behaviors, Usage guidelines, Component options).
- **tools/s2-docs-to-document-blocks**: Generator improvements — auto-dedupes
  duplicate scrape artefacts, seeds `purpose` blocks from component `description`
  when no Overview section is scraped, and formats output with Prettier for clean
  diffs.
