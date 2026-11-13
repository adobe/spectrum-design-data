---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Add `status-light` dot relationships for the `gray`, `red`, `orange`, `green`
and `blue` colors and the `accent` role (3 records each: light, dark, wireframe),
pointing at the existing `*-visual-color` tokens. Add `accent` and `blue` to the
component's `variant` options. The set now matches the official S2 - Web Figma
file's status light.
