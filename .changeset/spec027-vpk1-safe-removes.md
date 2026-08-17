---
"@adobe/spectrum-design-data": minor
"@adobe/spectrum-tokens": minor
---

Resolve SPEC-027 dangling `tokenBindings` via design-owner triage
(spectrum-design-data-vpk.1).

- **components/cards.json**: drop 4 `card-selection-background-corner-radius-*`
  bindings — card-selection only has background-size/-color tokens, no
  corner-radius family exists.
- **components/menu.json**: drop the `popover-submenu-to-menu-item-position`
  binding — no "submenu" token exists anywhere in the dataset.
- **components/alert-dialog.json**: drop the `alert-dialog-top-to-alert-icon`
  binding — no matching spacing token exists in the live Figma spec.
- **components/date-picker.json**: drop the 3 `range-border-dash-*` bindings —
  the live spec documents a solid range fill, not a dashed border.
- **tokens/token-types/angle.json**: add a new `angle` token type (degrees) for
  rotation/direction values like gradient angle.
- **tokens**: define 8 tokens confirmed live in Figma but missing from the
  corpus — tabs gap/indicator-thickness, `neutral-content-color-selected-*`,
  date-picker strikethrough thickness/angle and in-field-button gap.
