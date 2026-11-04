<!-- Copyright 2026 Adobe. All rights reserved. -->

# figma-spec-plugin

A Figma plugin that renders a component spec sheet (`design-data spec-sheet <component>`, see `component-spec-sheet.schema.json`) and an optional changelog onto a canvas, idempotently by root frame name.

* `code.js` and `ui.html` run unbundled in the Figma plugin sandbox; there is no build step.
* The plugin adds no layout or overlay logic: visuals are the block scenes scaled by `render.view`, measurements come from `scene.measurements`.
* `moon run figma-spec-plugin:check` only catches syntax errors. The test runs `code.js` against a fake `figma` global and the checked-in action-button sheet. The run path in Figma desktop is unverified (bead 11k.7.6, part of hzje.28).
* Test: `moon run figma-spec-plugin:test`.
* `payloads.mjs` turns a sheet (and changelog) into `use_figma` payloads for agents: `node payloads.mjs <sheet.json> [--changelog f] -o <dir>` writes numbered JS files (each under 45,000 characters, the core repeated in every one because `use_figma` keeps no state) and a manifest. Run them in order, one `use_figma` call each; the last renames the render and removes the previous one. Keep the `// shell:begin` / `// shell:end` markers in `code.js`: everything between them is left out of payloads.
* `code.js` must not call `figma.notify` unguarded, `setPluginData` or anything UI-only in the core: `use_figma` rejects them. The tests run the payloads and the plugin against the same fake `figma` and compare the trees.
