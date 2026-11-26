---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Remove 301 redundant `name.legacyKey` pins from live tokens (color-aliases 42,
icons 3, layout 160, layout-component 96). Each name is rebuilt from the name
object, so the legacy `@adobe/spectrum-tokens` output is byte-identical and
the spec-sheet output is unchanged. Deprecated tokens and relationship record
pins are untouched. The embedded tokens change, hence the wasm patch.
