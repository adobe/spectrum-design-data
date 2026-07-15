---
"@adobe/spectrum-design-data": minor
---

Fix compound-property matching for line-height/component-size tokens and
register the missing component-size vocabulary (closes
spectrum-design-data-dsi.2.6).

- **tools/token-mapping-analyzer/src/decomposer.js**: register
  `line-height-font-size`, `component-height`, `component-size-difference`,
  `component-size-maximum-perspective`, and `component-size-width-ratio` as
  compound properties, fixing 26 tokens previously flagged as unmatched
  vocabulary gaps.
- **registry/property-terms.json**: register `component-size-maximum-perspective`,
  `component-size-difference`, and `component-size-width-ratio` (parity with
  the existing `component-size-minimum-perspective` entry); these calculate
  the CSS perspective transform for S2 components' pressed/"down"-state
  scale-down effect.
