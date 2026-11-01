---
"@adobe/design-data-wasm": minor
"@adobe/design-data-tui": patch
---

Render component visuals through a platform manifest.

- `design-data render` and `design-data site` accept the global `--platform <id>` (or
  `DESIGN_DATA_PLATFORM` / `default_platform`) and apply the Foundation to Platform cascade
  before building scenes: tokens are filtered and overridden, and extension components,
  relationships and tokens are layered in.
- A recipe binding that does not resolve under a platform is reported as
  `warning: platform '<id>': ...`. The site lists these in a panel instead of drawing nothing.
- The site writes the platform into `data.json` and names it in the nav heading
  ("Foundation" when none is selected).
- WASM: `Dataset.applyPlatform(manifest)` applies a manifest with its `extensions` merged
  inline, so `renderScene` and `renderSvg` render a platform build.
- With no platform selected, output is unchanged.
