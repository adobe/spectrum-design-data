---
"@adobe/design-data-mcp": patch
---

`design-data-render` SVG layout now ignores `DESIGN_DATA_FONT` as well as `fontPath`. Both still
choose the PNG font. With the variable set, SVG sizing had used the built-in Source Sans 3 table
even when Adobe Clean Spectrum VF was installed. A test covers both.
