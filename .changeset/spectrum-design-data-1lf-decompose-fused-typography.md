---
"@adobe/spectrum-design-data": minor
"@adobe/spectrum-tokens": minor
---

Decompose the 12 remaining fused-property typography tokens onto proper
`component`/`property`/`script`/`size` fields (closes spectrum-design-data-1lf).

- **packages/design-data/tokens/typography.tokens.json**: `body-cjk-size-{l,m,s,xl,xs,xxl,xxs,xxxl}`
  and `body-size-xxs` get `component: "body"`, `property: "font-size"`; `heading-cjk-font-weight`
  gets `component: "heading"`, `property: "font-weight"`; `heading-cjk-size-xxxxl` and
  `heading-size-xxxxl` get `component: "heading"`, `property: "font-size"`. All 12 retain
  `legacyKey` to pin their published fused name.
- **packages/tokens/src/typography.json**: regenerated legacy output now carries a
  `component` attribute on these 12 tokens (previously absent) — an accepted, additive
  publish diff.
