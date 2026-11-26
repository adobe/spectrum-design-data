---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Remove 194 redundant `name.legacyKey` pins from live tokens (color-aliases 7,
layout 133, layout-component 54). Each name is rebuilt from the name object,
so the legacy `@adobe/spectrum-tokens` output is byte-identical and the
spec-sheet, render and site output are unchanged. Deprecated tokens and
relationship record pins are untouched. The embedded tokens change, hence the
wasm patch.

For MCP users: `design-data-query` now returns the cascade-derived `name` for
these tokens (for example `property=key-color emphasis=emphasized
structure=drop-shadow colorScheme=light` instead of
`drop-shadow-emphasized-key-color`), and `design-data-token-usage` no longer
finds up to 129 of them by their legacy name. Look them up by uuid or the
cascade label.
