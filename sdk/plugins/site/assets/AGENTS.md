<!-- Copyright 2026 Adobe. All rights reserved. -->

# sdk/plugins/site/assets

Browser assets (HTML and visual runtime) embedded by the site generator.

* **Audience:** consumer. **Lifecycle:** active. **npm:** not published.
* `visual-runtime.js` mirrors `sdk/core/src/visual.rs`; `sdk/wasm/test/visual-runtime-parity.test.js` keeps them in lockstep.
* `assets/constraints.js` mirrors `sdk/core/src/constraints.rs`; `sdk/core/tests/constraint_cases.rs` and `sdk/wasm/test/constraints-parity.test.js` run the same `sdk/core/tests/fixtures/option-constraint-cases.json`.
* `spectrum-controls.js` is a generated bundle of the Spectrum Web Components behind the control panel (`sp-theme`, `sp-picker`, `sp-switch`). Do not edit it; change `../controls/entry.js` and run `../controls/build.sh`.
* Repository-wide rules are in [the root AGENTS.md](../../../../AGENTS.md). The [repository index](../../../../docs/repo-index.md) lists every project.

## Commands

```bash
moon run sdk-wasm:test
```
