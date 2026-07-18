---
"@adobe/spectrum-design-data": patch
---

Pin `name.legacyKey` on 133 fused-property residual tokens in
`layout-component.tokens.json` (a9t) whose `property` string fuses a
relation and size term with no density term (e.g.
`card-default-width-extra-large`). These already round-trip correctly via
`naming.rs`'s thin-format/general-walk fallback — the pin is a
forward-compat anchor against a future decompose() migration silently
renaming them, not a fix for an active `serialize()` bug.

- **packages/design-data/tokens/layout-component.tokens.json**: pinned
  `legacyKey` on 133 tokens (86 distinct property strings) across `card`,
  `collection-card`, `field-label`, `in-field-button`, `menu`, `slider`,
  `steplist`, `switch`, `table`, and `tag-field`, resolved by `uuid` match
  against `packages/tokens/src/layout-component.json`. All 133 are pure
  relation+size compounds needing no `property-terms.json` registration
  (the atomic-term examples the bead flagged belong to the separate `opk`
  bead).
