---
"@adobe/design-data-mcp": minor
"@adobe/design-data-wasm": minor
---

PNG rendering now falls back to Adobe Clean VF (Roman .ttf) before the bundled Source Sans 3
when Adobe Clean Spectrum VF is not installed.

- Adobe Clean Serif VF, Italic and .otf files are never used.
- `fallback` stays true for any font other than Spectrum VF, and `found` still means
  "Spectrum VF or a font you chose". The status gains `family` and `installed`.
- The help text names the font used and warns that metrics, spacing and wrapping may differ.
- `DESIGN_DATA_FONT` and `fontPath` behave as before.
