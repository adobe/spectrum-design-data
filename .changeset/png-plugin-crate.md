---
"@adobe/design-data-wasm": patch
---

Build the PNG renderer from the new `design-data-png` plugin crate instead of
`design-data-core`. The package API is unchanged; the wasm binary is about
5 KB larger (17,899,724 to 17,904,989 B raw, 3,106,947 to 3,107,616 B gzip).
