---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-spec": patch
"@adobe/design-data-wasm": patch
---

Button: the `variant` default is now `primary`, matching Figma, React Spectrum S2
and SWC Gen2 (it was `accent`). Adds a `hasTrailingIcon` option with a
`trailing-icon` anatomy part, slot and recipe part. The visual recipe binds
"Minimum height" as `minHeight`, the label sets `overflow: wrap`, and the root
`minWidth` reads the `minimum-width-multiplier` token (2.25 times the height) when
a label shows. The `focus` state is renamed `keyboard-focus`, as in the other recipes and in the
relationship scopes, so one state name draws the focus ring. The focus fill is
unchanged: the relationships still pin it to the default tokens.
The renderer reads `relativeTo: "height"` on a root `minWidth`.
