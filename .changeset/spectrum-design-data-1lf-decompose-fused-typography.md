---
"@adobe/spectrum-design-data": minor
"@adobe/spectrum-tokens": minor
---

Decompose the 16 remaining fused-property typography tokens onto proper
`component`/`property`/`family`/`script`/`emphasis`/`size` fields (closes
spectrum-design-data-1lf).

- **packages/design-data/tokens/typography.tokens.json**:
  `body-cjk-size-{l,m,s,xl,xs,xxl,xxs,xxxl}`, `body-size-xxs`, `heading-cjk-font-weight`,
  `heading-cjk-size-xxxxl`, `heading-size-xxxxl` get `component`/`property`/`script`/`size`
  fields, retaining `legacyKey` to pin their published fused name.
  `heading-{sans-serif,serif}[-emphasized]-font-weight` get `component`/`property`/`family`/
  `emphasis` fields; their reconstructed names already match the fused originals, so no
  `legacyKey` pin is needed.
- **packages/tokens/src/typography.json**: regenerated legacy output now carries a
  `component` attribute on these 16 tokens (previously absent) — an accepted, additive
  publish diff.
