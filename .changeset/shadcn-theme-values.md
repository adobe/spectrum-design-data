---
"@adobe/design-data-tui": patch
---

Fix the shadcn theme export (`export --format shadcn-theme`).

- **design-data-tui**: include the component-scoped legacy tokens
  (`avatar-border-width`, `action-bar-height` and about 1,280 more). The export
  never loaded the relationships catalog, so they were missing.
- **design-data-tui**: write `*-font-weight` tokens as numbers (300 to 900)
  instead of `light`, `medium`, `bold` and so on, which are not valid CSS.
- **design-data-tui**: write `corner-radius-*` and `gradient-stop-*` fractions
  as percentages (`corner-radius-full` is `50%`, not `0.5`).
- **design-data-tui**: add `spectrum-sans-font-family-stack`, a font stack that
  falls back to system fonts.
