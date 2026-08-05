---
"@adobe/spectrum-design-data": minor
---

Add an `excludeFromLegacy` token field so new tokens without Tokens Studio
precedent can be authored directly in design-data without publishing to the
legacy flat-key mirror, and use it to fix SPEC-027 dangling `button.json`
corner-radius bindings (bead spectrum-design-data-vpk.1).

- **packages/design-data-spec/schemas/token.schema.json**: new optional
  `excludeFromLegacy: boolean` on both token shapes.
- **sdk/core/src/legacy.rs**: `convert_array` skips any token with
  `excludeFromLegacy: true` before it's grouped into legacy output.
- **packages/design-data/tokens/layout.tokens.json**: add
  `button`/`corner-radius` tokens for `small`/`medium`/`large`/`extra-large`
  (desktop + mobile), literal pixel values derived from
  `component-height-*` ÷ 2, marked `excludeFromLegacy` — no legacy output
  change.
- **packages/design-data/components/button.json**: rebind the three
  corner-radius entries from the non-existent literal strings
  `corner-radius-button-{small,large,extra-large}` to the new tokens'
  resolved key `button-corner-radius-{small,large,extra-large}`.
