---
"@adobe/spectrum-design-data": patch
---

Pin `name.legacyKey` on 133 fused-property residual tokens in
`layout-component.tokens.json` (a9t) whose `property` string fuses a
relation and size term with no density term (e.g.
`card-default-width-extra-large`, `handle-large`), so the published legacy
name round-trips through `serialize()` without requiring decomposer changes.

- **packages/design-data/tokens/layout-component.tokens.json**: pinned
  `legacyKey` on 133 tokens (86 distinct property strings) across the
  `card`, `collection-card`, `field-label`, `in-field-button`, `menu`,
  `slider`, `steplist`, `switch`, `table`, and `tag-field` component
  families, resolved by `uuid` match against
  `packages/tokens/src/layout-component.json` — never reconstructed from
  the serialized name, per the dsi.3/dsi.7 house convention. All 133 are
  pure relation+size compounds; none are bare atomic terms, so no
  `property-terms.json` registration is needed for this set (the
  atomic/heterogeneous residual the bead flagged as a possible register
  candidate — `corner-radius`, `border-dash-gap`, etc. — belongs to the
  separate `opk` bead, not this one).
