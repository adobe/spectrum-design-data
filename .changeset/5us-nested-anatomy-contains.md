---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
---

Add SPEC-048 to validate nested anatomy `contains` references, and populate `contains`
for the menu, list-view, and table composite items (closes spectrum-design-data-5us).

- **packages/design-data-spec/rules/rules.yaml**: add SPEC-048 `anatomy-contains-resolves`
  (warning) — a `contains` entry SHOULD match a sibling anatomy part's `name`.
- **packages/design-data-spec/schemas/{anatomy-part,component}.schema.json**: update the
  `contains` field description now that it has a validation rule.
- **packages/design-data-spec/spec/anatomy-format.md**: document the flat-vs-`contains`
  authoring convention and the new rule.
- **sdk/core/src/validate/rules/spec048.rs**: implement the rule; register in `mod.rs`.
- **packages/design-data/components/menu.json**: declare `menu-item`'s child parts
  (icon, label, description, value, switch, checkbox, thumbnail, drill-in-chevron,
  link-out-icon) and populate `contains`.
- **packages/design-data/components/list-view.json**: add an `anatomy` array with
  `list-item` and its child parts.
- **packages/design-data/components/table.json**: populate `row`'s `contains` with the
  existing `row-checkbox` part.
