---
"@adobe/design-data-wasm": patch
---

Fix the DTCG export of typography composites under a non-default scale. Inner aliases
(`{font-size-300}`) always resolved to the desktop row, so `export --scale mobile --format dtcg`
gave `component-xl-medium` a 18px font size and 22px line height instead of 22px and 26px.
