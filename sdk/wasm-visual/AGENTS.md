<!-- Copyright 2026 Adobe. All rights reserved. -->

# [**@adobe/design-data-visual**](https://github.com/adobe/design-data-visual)

Slim solve-only WebAssembly engine for component visual recipes.

* **Audience:** consumer. **Lifecycle:** incubating. **npm:** published. User-visible changes need a changeset.
* Repository-wide rules are in [the root AGENTS.md](../../AGENTS.md). The [repository index](../../docs/repo-index.md) lists every project.
* No layout code lives here: it calls `design_data_core::visual::solve`. See [README.md](README.md).

## Facets

The engine embeds no behavior contracts and must not. A recipe `facets` clause is folded into
`options` and `states` when the recipe is compiled (`design_data_core::behavior::expand_facets`),
and the variants this package ships come from `design-data site --data-only`, which loads the
contracts. `solve` never sees a `facets` clause.

## Commands

```bash
moon run sdk-wasm-visual:build
moon run sdk-wasm-visual:test
moon run sdk-wasm-visual:verify-package   # build-package, pack, render a packed variant
```
