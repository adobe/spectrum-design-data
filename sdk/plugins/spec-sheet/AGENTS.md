<!-- Copyright 2026 Adobe. All rights reserved. -->

# sdk/plugins/spec-sheet

Component spec-sheet generator: the sheet model behind the Figma payloads and the web SVG.

* **Audience:** consumer. **Lifecycle:** active. **npm:** not published.
* Repository-wide rules are in [the root AGENTS.md](../../../AGENTS.md). The [repository index](../../../docs/repo-index.md) lists every project. The plugin model is in [PLUGINS.md](../PLUGINS.md).
* `build_sheet` takes a loaded `TokenGraph`, the registry directory, a size, an optional changelog and text metrics, and returns the sheet JSON. `sections.rs` fills the template sections from component data (accessibility from the behavior contract, with a test that it equals the block). The CLI command `design-data spec-sheet` (`sdk/cli/src/spec_sheet.rs`) owns loading, flags and file output.
* The crate depends on `design-data-core` only; core must never depend on it. Its output is covered by a byte-identical comparison against the previous CLI, so a change to the sheet JSON is a user-visible change.

## Commands

```bash
moon run sdk:build
moon run sdk:test
moon run sdk:lint
```
