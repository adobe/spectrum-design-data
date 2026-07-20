---
"@adobe/spectrum-design-data": patch
---

Converged the drifted `key-focus` state alias onto its registry-canonical form
`keyboard-focus` (bead spectrum-design-data-bja). Published legacy names are
unaffected since each token's `legacyKey` already pins the flat output name.

- **packages/design-data/tokens/color-aliases.tokens.json**: 22 tokens'
  `name.state` changed from `key-focus` to `keyboard-focus`.
- **packages/design-data/tokens/color-component.tokens.json**: 1 token's
  `name.state` changed from `key-focus` to `keyboard-focus`.
- **packages/design-data/tokens/layout-component.tokens.json**: 2 tokens'
  `name.state` changed from `key-focus` to `keyboard-focus`.
- **packages/design-data/tokens/semantic-color-palette.tokens.json**: 1
  token's `name.state` changed from `key-focus` to `keyboard-focus`.
- **packages/design-data/components/stack-item.json**: declared state
  renamed from `key-focus` to `keyboard-focus` to match.
