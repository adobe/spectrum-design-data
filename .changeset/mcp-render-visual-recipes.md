---
"@adobe/design-data-mcp": minor
"@adobe/design-data-wasm": minor
"@adobe/spectrum-design-data": minor
---

Add visual recipes to the embedded data and render them to SVG.

* MCP: new `design-data-visual-recipe` and `design-data-render` tools.
* WASM: `Dataset.embedded()` now carries recipes. New `visualRecipes()`,
  `visualRecipe(name)` and `renderComponentSvg(request)`.
* `@adobe/spectrum-design-data` publishes `visuals/` and exports `./visuals/*`.
