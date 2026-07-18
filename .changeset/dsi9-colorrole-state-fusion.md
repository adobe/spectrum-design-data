---
"@adobe/spectrum-design-data": patch
---

Split fused `colorRole`/`state`/`variant` segments out of `name.property` for
the 41 no-legacyKey residual tokens flagged by dsi.9, pinning `name.legacyKey`
on each to preserve the published legacy name (matches the existing
convention already used by every correctly-authored `colorRole` entry in the
same files).

- **packages/design-data/tokens/color-aliases.tokens.json**: 37 tokens
  re-authored: role words to `colorRole`, `disabled` to `state` (it's a
  registered state, not a color role), `static`+`black`/`white` to
  `variant`+`colorFamily`, and double-stacked state tokens to Proposal 005's
  compound-state convention (`state: "focus-hover"`, `"selected-default"`) —
  its first real implementation.
- **packages/design-data/tokens/semantic-color-palette.tokens.json**: 4
  `negative-subdued-background-color-*` tokens split to `colorRole`+`variant`.
- **docs/proposals/005-compound-states.md**: marked Accepted for the
  `color-aliases.json` instances; `color-component.json` instances remain
  tracked under dsi.11.
