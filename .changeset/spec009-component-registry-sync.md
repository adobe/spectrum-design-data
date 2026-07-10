---
"@adobe/spectrum-design-data": patch
---

Sync `components.json` with existing component definitions and decompose a misclassified
drop-shadow state (part of SPEC-009 triage epic, closes spectrum-design-data-dm2.3).

- **packages/design-data/registry/components.json**: add 32 missing component ids — 20 with
  existing `components/*.json` definitions (`heading`, `tree-view`, `body`, …) and 12 without a
  dedicated file yet (`date-field`, `floating-action-button`, `card`, the card variants
  `collection-card`/`user-card`/`card-horizontal`, …).
- **packages/design-data/tokens/color-aliases.tokens.json**: decompose the drop-shadow
  `emphasized` token from `{property: "drop-shadow", state: "emphasized"}` to
  `{property: "drop-shadow", variant: "emphasized"}` — emphasis isn't an interactive state.
  A `legacyKey` pins the published flat name so `@adobe/spectrum-tokens` consumers see no change.
- **packages/design-data/registry/variants.json**: add `emphasized` (category `emphasis`).
