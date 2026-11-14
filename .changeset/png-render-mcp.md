---
"@adobe/design-data-mcp": minor
---

Render PNG with the installed Adobe Clean Spectrum VF, and report which font was used.

- **`design-data-render`**: new `format` (`svg` by default, or `png`), `pixelRatio` and
  `fontPath`. PNG returns an image plus `{ font, diagnostics }`.
- **`design-data-font-status`**: new tool reporting whether Adobe Clean Spectrum VF was found,
  what was skipped and why, and install help.
- **Font search**: looks in the user's font folders and Creative Cloud's font cache, reading
  each file's name table, or uses `fontPath`, `DESIGN_DATA_FONT`, or an optional install-time
  file field. With no match it uses a bundled Source Sans 3 (SIL OFL) and says so.
- Tool descriptions and server instructions tell the model to relay the status: not exact on
  fallback, and no download advice when the font was found.
