---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Migrate breadcrumbs and steplist to level 2 identity (5m92.6).

- Every live record now names a part or a between, no property name carries structure, and
  no identity is shared by records with different contexts.
- Breadcrumbs: the current page title is a breadcrumb-title part that owns the multiline
  font and the top text to bottom text spacing. Edge and item spacing becomes space-between
  with start-edge, end-edge, top-edge and bottom-edge endpoints.
- Steplist: track is a child part of step. Font names lose their size suffix.
- Colour records get an attribute (background or border) and colorScheme pins. Records that
  scale carry scale pins; breadcrumbs records are pinned to isMultiline false or true.
- Disabled colour records share the context of their sibling records, because the disabled
  state is not a declared option. The state stays on the referenced token.

Legacy `@adobe/spectrum-tokens` output is byte-identical.
