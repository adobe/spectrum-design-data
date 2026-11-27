---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Bind the progress-circle, in-field-progress-circle, divider, field-label and help-text
recipes to structured identity.
The legacy `@adobe/spectrum-tokens` output, every rendered SVG and every spec sheet are unchanged.

- The five components move from status level 2 to level 3. Each recipe binding that selected a
  relationship by `context` now selects it by `property` and `part` (progress-circle and
  in-field-progress-circle: `track` and `fill`; divider: `line`; field-label: `container` and
  `necessity-indicator`; help-text: `icon`, `container` and `text`). Context selectors 31 to 0.
- No relationship record changes: they already carried the part.
