<!-- Copyright 2026 Adobe. All rights reserved. -->

# component-spec-generator

Stage 1 of the generated S2 Tokens spec pipeline. Joins CTR relationship rows (`packages/design-data/relationships/`) to resolved cascade values and emits a per-component `component-token-spec.json`. Stage 2 is `tools/figma-spec-plugin`.

* Read data from `packages/design-data` only; never from `packages/tokens`.
* Run: `moon run component-spec-generator:generate -- --component accordion [--out path]`.
* Test: `moon run component-spec-generator:test` (builds `sdk-wasm` first).
* Prototype scope: density/size parsing is only validated on accordion. Report unparsed names instead of guessing.
