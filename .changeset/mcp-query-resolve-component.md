---
"@adobe/design-data-wasm": minor
"@adobe/design-data-mcp": minor
---

Make component filtering and token resolution usable.

- `query` (`component=button`) now matches tokens that a component's relationships
  reference, not only the few tokens with `name.component`. `component` is listed
  as an indexed field.
- `resolve` (wasm, CLI and TUI property resolution) picks the winner among active
  tokens first, so an active token now beats a more specific deprecated one. A
  deprecated token still wins when no active token matches.
- `design-data-resolve` accepts `component`, `variant`, `state`, `colorRole` and
  `excludeDeprecated` to narrow before the ambiguous fallback.
- `design-data-primer` reports the real `modeSets` (colorScheme, scale, contrast
  modes); they were always empty.
- `design-data-query` and `design-data-resolve` descriptions list only filterable
  fields and drop the `property=color-*` example, which matches nothing.
