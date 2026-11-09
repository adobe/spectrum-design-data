<!-- Copyright 2026 Adobe. All rights reserved. -->

# design-data-wasm-visual

Slim solve-only WebAssembly engine for component visual recipes.

* **Audience:** maintainer. **Lifecycle:** incubating. **Published:** no (private crate).
* Repository-wide rules are in [the root AGENTS.md](../../AGENTS.md). The [repository index](../../docs/repo-index.md) lists every project.
* No layout code lives here: it calls `design_data_core::visual::solve`. See [README.md](README.md).

## Commands

```bash
moon run sdk-wasm-visual:build
moon run sdk-wasm-visual:test
```
