---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Add 12 `status-light` "Non-semantic (Dot)" relationships for the `gray`, `red`,
`orange` and `green` variants (light, dark and wireframe each), pointing at the
existing `*-visual-color` tokens. These four options now resolve to a dot color,
matching the Figma Web POC status light. Colors the POC adds beyond the catalog
(`blue`, `accent`) are not included.
