---
"@adobe/design-data-wasm": patch
---

Batch render and numeric comparison with measured platform values.

- `design-data render --batch states.json --out <dir>` renders a list of states (component,
  size, options, states, color scheme, scale, label, optional platform) to SVG plus scene
  JSON, with an `index.json`.
- `design-data render-compare --scenes <dir> --measured measured.json` reports differences
  against configurable tolerances as JSON or Markdown, with gap-bead labels. Label-width
  differences are flagged as possibly caused by the R2 text-width estimate.
- New `design_data_core::visual_compare` module. The measured-values format
  (`design-data-measured/1`) is documented in `docs/visual-comparison.md`.
