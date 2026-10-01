---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Promote public Spectrum Hub guidance to the stable release channel.

- **packages/design-data**: refresh component guidance and publish the Hub guideline
  corpus, including the October 1 public-site sync.
- **sdk/wasm**: rebuild embedded guidance for MCP and JavaScript consumers.
- **tools/s2-docs-to-document-blocks**: reject duplicate component slugs and retain
  section introductions alongside their subsections in published guidance.
- **tools/spectrum-hub-fetcher**: fetch and merge public Hub pages for component and
  guideline syncs, reconciling obsolete slugs and category paths, preserving text
  boundaries, and decoding HTML entities before transformation.
