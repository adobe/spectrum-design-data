---
"@adobe/design-data-spec": major
"@adobe/spectrum-design-data": minor
"@adobe/spectrum-tokens": minor
"@adobe/design-data-wasm": patch
"@adobe/design-data-agent-mcp": patch
---

Remove the component `tokenBindings` field. Relationships carry that data.
- **Spec (breaking):** `tokenBindings` is gone from `component.schema.json` and rule SPEC-027
  is retired. A component that still has the field now fails schema validation. Use
  `relationships/<component>.json`; SPEC-055 checks each `$ref`. To migrate, turn each
  `{ token, context }` entry into a relationship with the token's uuid as `$ref`.
- **Button:** adds `corner-radius-button-small` (12px), `corner-radius-button-large` (20px)
  and `corner-radius-button-extra-large` (24px) for wrapping labels. The 16px wrapping
  relationship is now scoped to size `m`; `s`, `l` and `xl` have their own. The three names
  were referenced but never defined.
- **Tabs, date picker:** four bindings with no relationship now have one.
- **Component data:** declares anatomy parts, sizes and states that relationships already
  used (steplist, menu, table, tag-field, card, stack-item, body, heading, detail). List-view
  and radio-button relationships now name their existing parts. Illustrated message uses a
  `script: cjk` option instead of `-cjk` sizes.
- **Validation:** `design-data:validate` no longer downgrades component-rule errors to warnings.
  Table declares the `xl` size its relationships use.
- **Agent MCP:** `describe_component` returns `relationships`; docs drop `tokenBindings`.
