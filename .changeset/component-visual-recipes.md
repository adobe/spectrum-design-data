---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-spec": minor
"@adobe/design-data-wasm": minor
---

Add a draft component visual recipe format for rendering to SVG, PNG, and Figma.

- **spec/component-visuals.md**: draft RFC with the recipe shape and renderer decisions.
- **schemas/component-visual.schema.json**: Layer 1 schema for recipes.
- **visuals/action-button.json**: pilot recipe binding parts to tokens.
- **components/action-button.json**: declares anatomy parts and the `isPending` option.
- **sdk (core, cli)**: `design-data render <component>` resolves a recipe to SVG.
- **sdk/wasm**: `Dataset.renderScene` and `Dataset.renderSvg` render recipes in the browser.
- **sdk/core**: `compile_recipe` pre-resolves token bindings for the no-WASM site.
- **visuals/button.json**: variant, style, state, and static color recipe for `button`.
- **components/button.json**: adds container, progress, and focus-ring anatomy and a `down` state.
- **spec and renderers**: container `stroke`, `relativeTo: "height"` radius, pressed scale-down.
- **badge**: `visuals/badge.json` recipe plus container, icon, label anatomy.
- **renderers and site**: per-corner radius props, font weight names to numbers, label presence.
- **sdk/plugins/site**: `design-data site --out <dir>` writes a static explorer, no WASM.
- **sdk/plugins/site**: usage matrix zooms to anatomy and specs; tokens show Figma names.
- **components/badge.json**: remove the `isDisabled` option; badge has no disabled state.
- **sdk/plugins/figma**: `variable_names` maps tokens to Figma variable names offline.
- **sdk/core**: scene token refs carry alias `chain`; press tokens are tracked.
