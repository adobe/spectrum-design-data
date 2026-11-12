---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Pin `scope.options.variant` on the 57 `status-light` "Semantic (Dot)" and
"Non-semantic (Dot)" relationships, taken from each referenced token's
`colorRole` or `colorFamily`. A `variant` selector now resolves to one token
instead of one per colour family. The `gray`, `red`, `orange` and `green`
options still have no dot token.
