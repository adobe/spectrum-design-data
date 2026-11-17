---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Fix the close button static colors to match Figma and React Spectrum. The hover fill uses
`transparent-white/black-200` (0.14 / 0.12, was the 100 tokens) and the disabled cross uses
`transparent-white/black-400` (0.21 / 0.22, was an alias of the 100 tokens). The same tokens
`action-button` and `button` use for static hover and disabled.
