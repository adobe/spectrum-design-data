---
"@adobe/spectrum-design-data": minor
---

Migrate the final 19 space-between gap endpoints; defer SPEC-047's declared-anatomy
check when no component catalog is loaded (closes 04c.8).

- **sdk/core/src/validate/rules/spec047.rs**: defer (don't error) on a component-scoped
  gap endpoint when `validate-dataset` runs with no component catalog loaded, since its
  declared-anatomy-part arm can't be evaluated; mirrors SPEC-018's empty-catalog guard.
- **packages/design-data/tokens/layout-component.tokens.json**: decompose the last 19
  `{a}-to-{b}` tokens (menu, tree-view, status-light, alert-banner, etc.) into structured
  `from`/`to` fields — all 134 eligible gap tokens are now migrated.
