---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Remove 250 redundant `name.legacyKey` pins from live tokens (color-aliases 9,
icons 3, layout 149, layout-component 89). Each name is rebuilt from the name
object, so the legacy `@adobe/spectrum-tokens` output is byte-identical and
the spec-sheet and site output are unchanged. Deprecated tokens and relationship record
pins are untouched. The embedded tokens change, hence the wasm patch.
