---
"@adobe/design-data-wasm": patch
---

`renderScene` and `renderSvg` wrap a text part that sets `overflow` when the
request has a `width`: the scene has one text node per line and the root grows to
fit. Renders of recipes without `overflow` are unchanged.
