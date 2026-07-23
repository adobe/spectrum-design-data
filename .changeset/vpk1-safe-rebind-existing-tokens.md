---
"@adobe/spectrum-design-data": patch
---

Fix SPEC-027 dangling `tokenBindings` for three "safe rebind" cases (bead
`spectrum-design-data-vpk.1`) where the S2 spec names an existing token, so no
new token or design-owner sign-off was needed.

- **packages/design-data/components/cards.json**: rebind
  `card-thumbnail-to-title` to `spacing-100` — the spec documents this gap as
  `8px (spacing-100)`.
- **packages/design-data/components/menu.json**: rebind `menu-item-to-items`
  to `spacing-50` — the spec documents this gap as `2px (spacing-50)`.
- **packages/design-data/components/list-view.json**: rebind the bare
  `component-edge-to-text` to `component-edge-to-text-100`, matching every
  other numbered token already bound in this component's `-100` step.
