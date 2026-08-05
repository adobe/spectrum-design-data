---
"@adobe/spectrum-design-data": patch
---

Fix SPEC-027 dangling `component-top-to-workflow-icon-400` tokenBindings
(bead spectrum-design-data-vpk.1, group A).

- **packages/design-data/components/combo-box.json**, **number-field.json**,
  **text-area.json**, **text-field.json**: rebind the leading-icon spacing
  entry from `component-top-to-workflow-icon-400` — a step that doesn't
  exist in the token family (which caps at `-300`) and isn't referenced
  anywhere else — to the existing `component-top-to-workflow-icon-300`.
