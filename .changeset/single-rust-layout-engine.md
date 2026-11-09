---
"@adobe/design-data-spec": patch
---

Component visuals: layout and text measurement now exist once, in Rust.
The spec no longer describes a JavaScript runtime that mirrors the
reference renderer. Browsers load the same solver as WASM and only draw
the scene.
