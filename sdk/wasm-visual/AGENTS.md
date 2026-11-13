<!-- Copyright 2026 Adobe. All rights reserved. -->

# [**@adobe/design-data-visual**](https://github.com/adobe/design-data-visual)

Slim solve-only WebAssembly engine for component visual recipes.

* **Audience:** consumer. **Lifecycle:** incubating. **npm:** published. User-visible changes need a changeset.
* Repository-wide rules are in [the root AGENTS.md](../../AGENTS.md). The [repository index](../../docs/repo-index.md) lists every project.
* No layout code lives here: it calls `design_data_core::visual::solve`. See [README.md](README.md).

## Commands

```bash
moon run sdk-wasm-visual:build
moon run sdk-wasm-visual:test
moon run sdk-wasm-visual:verify-package   # build-package, pack, render a packed variant
```
