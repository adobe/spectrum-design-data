---
"@adobe/spectrum-tokens": minor
"@adobe/design-data": minor
---

feat(tokens): Phase D pilot — size field decomposition and apply.js migration tool.

- **tools/token-mapping-analyzer/src/apply.js**: field-migration writer; takes
  `--field <name>` and applies HIGH-confidence roundtrip-safe decompositions from
  the existing decomposer to cascade token files in place.
- **tools/token-mapping-analyzer/test/apply.test.js**: roundtrip-preservation
  assertion ensuring every patched token serializes back to its original legacy key.
- **packages/design-data/tokens/layout-component.tokens.json**, **layout.tokens.json**:
  47 tokens with simple size suffixes (l, s, xl, xs) now carry a structured `size`
  field; `property` trimmed to the root term.
- **packages/tokens/src/**: regenerated legacy output via design-data:legacy-output.
