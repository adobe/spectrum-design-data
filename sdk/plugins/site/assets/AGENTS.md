<!-- Copyright 2026 Adobe. All rights reserved. -->

# sdk/plugins/site/assets

Browser assets (HTML and visual runtime) embedded by the site generator.

* **Audience:** consumer. **Lifecycle:** active. **npm:** not published.
* `visual-runtime.js` mirrors `sdk/core/src/visual.rs`; `sdk/wasm/test/visual-runtime-parity.test.js` keeps them in lockstep.
* Text measurement reads `sdk/core/src/text-metrics/source-sans-3.json` (Source Sans 3, SIL OFL; licence beside it). Rust (`text_metrics.rs`) and `visual-runtime.js` share that one file; the site ships it as `text-metrics.json` (or the `--text-metrics` file it was built with) and `backend.js` loads it. Changing the table changes every visual golden and `recipe-snapshots.json`: regenerate with `VISUAL_PARITY_UPDATE=1 moon run sdk-wasm:test` and `UPDATE_RECIPE_SNAPSHOTS=1 cargo test -p design-data-core --test recipe_snapshots`. Never commit a table derived from Adobe Clean.
* `assets/constraints.js` mirrors `sdk/core/src/constraints.rs`; `sdk/core/tests/constraint_cases.rs` and `sdk/wasm/test/constraints-parity.test.js` run the same `sdk/core/tests/fixtures/option-constraint-cases.json`.
* `spectrum-controls.js` is a generated bundle of the Spectrum Web Components behind the control panel (`sp-theme`, `sp-picker`, `sp-switch`). Do not edit it; change `../controls/entry.js` (or `package.json`, then `UPDATE_LOCK=1 sh ../controls/build.sh` to refresh `pnpm-lock.yaml`) and run `../controls/build.sh`. The build also writes `THIRD-PARTY-NOTICES.txt` and keeps license banners at the end of the bundle; the site ships both.
* Repository-wide rules are in [the root AGENTS.md](../../../../AGENTS.md). The [repository index](../../../../docs/repo-index.md) lists every project.

## Commands

```bash
moon run sdk-wasm:test
```
