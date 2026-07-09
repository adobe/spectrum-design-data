---
"@adobe/spectrum-design-data": patch
---

Sync `components.json` with existing component definitions and decompose a misclassified
drop-shadow state (part of SPEC-009 triage epic, closes spectrum-design-data-dm2.3).

- **packages/design-data/registry/components.json**: add 32 missing component ids — 21 with
  existing `components/*.json` definitions (`heading`, `card`, `tree-view`, `body`, …), 8 real
  standalone components with no file yet (`date-field`, `floating-action-button`, …), and 3
  card variants (`collection-card`, `user-card`, `card-horizontal`).
- **packages/design-data/tokens/color-aliases.tokens.json**: decompose the drop-shadow
  `emphasized` token from `{property: "drop-shadow", state: "emphasized"}` to
  `{property: "drop-shadow", variant: "emphasized"}` — emphasis isn't an interactive state.
- **packages/design-data/registry/variants.json**: add `emphasized` (category `emphasis`).
