---
"@adobe/spectrum-design-data": minor
---

Populate documentBlocks on all 69 component JSON files from s2-docs source.

- **packages/design-data/components/*.json**: Add `documentBlocks` to all 69
  components — typed blocks (purpose, guideline, do-dont) from docs/s2-docs/. All
  69 have a leading `purpose` block seeded from Overview or the component description.
- **docs/s2-docs/components/inputs/color-handle.md**: Replace stub with full
  scraped content (Overview, Behaviors, Usage guidelines, Component options).
- **tools/s2-docs-to-document-blocks**: Generator — near-duplicate dedup via
  `normalizeForDedup()` collapses scrape artefacts differing by smart quotes or
  punctuation; seeds `purpose` blocks from component `description` when no Overview
  section is scraped; formats output with Prettier for clean diffs.
