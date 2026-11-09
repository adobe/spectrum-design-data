---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-spec": patch
"@adobe/design-data-wasm": patch
---

Button: the `variant` default is now `primary`, matching Figma, React Spectrum S2
and SWC Gen2 (it was `accent`). The visual recipe binds
"Minimum height" as `minHeight`, the label sets `overflow: wrap`, and the root
`minWidth` reads the `minimum-width-multiplier` token (2.25 times the height) when
a label shows. The `focus` state is renamed `keyboard-focus`, as in the other recipes and in the
relationship scopes, and the focus fill now takes the hover look (the key-focus
tokens for accent, negative and primary, gray-200 for secondary), as React
Spectrum S2 and SWC Gen2 do.
The renderer reads `relativeTo: "height"` on a root `minWidth`.
