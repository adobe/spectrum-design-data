<!-- Copyright 2026 Adobe. All rights reserved. -->

# figma-spec-plugin

Stage 2 of the generated S2 Tokens spec pipeline. A Figma plugin that renders the JSON from `tools/component-spec-generator` onto a canvas, idempotently by frame name.

* `code.js` and `ui.html` run unbundled in the Figma plugin sandbox; there is no build step.
* `moon run figma-spec-plugin:check` only catches syntax errors. Real behavior needs the Figma desktop app.
* Test: `moon run figma-spec-plugin:test`.
