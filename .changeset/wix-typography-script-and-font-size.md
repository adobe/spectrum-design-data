---
"@adobe/spectrum-design-data": minor
---

Reinstate the `script` field for CJK typography tokens and decompose all
font-size tokens to `property:"font-size"` + `size` (closes
spectrum-design-data-wix, amends Proposal 001, see spectrum-design-data-526).

- **packages/design-data/fields/script.json**, **registry/scripts.json**:
  new `script` field/registry — `cjk` writing-system variant, orthogonal
  to `family` (typeface classification). 22 sibling fields renumbered
  (`serialization.position` +1) to make room.
- **packages/design-data/registry/typography-families.json**: drop `cjk`.
- **packages/design-data/tokens/typography.tokens.json**: rename
  `family:"cjk"` → `script:"cjk"` (~63 tokens); decompose fused
  `code-cjk-*` tokens; decompose most font-size tokens to
  `property:"font-size"` + `size` + `script`?, `legacyKey` pinned
  (~47 tokens). 12 tokens kept fused-`property` (legacy escape hatch) to
  avoid adding a `component` attribute to `@adobe/spectrum-tokens`.
  `packages/tokens/src/typography.json` diff against `main` is empty.
- **sdk/core/src/validate/rules/spec043.rs**: accept `script` as a
  typography domain-identifying field alongside `family`.
