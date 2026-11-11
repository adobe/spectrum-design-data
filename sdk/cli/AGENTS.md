<!-- Copyright 2026 Adobe. All rights reserved. -->

# sdk/cli

The `design-data` command-line interface.

* **Audience:** consumer. **Lifecycle:** active. **npm:** not published.
* Repository-wide rules are in [the root AGENTS.md](../../AGENTS.md). The [repository index](../../docs/repo-index.md) lists every project.

## Commands

```bash
moon run sdk:build
moon run sdk:test
moon run sdk:lint
```

## Releases

Changesets do not release the CLI. `release.yml` builds and tags `design-data-cli@<version>` from the `version` in `sdk/cli/Cargo.toml` (and the Homebrew formula installs from that tag), so bump it, with `sdk/Cargo.lock`, in any PR that changes CLI behavior: minor for a new command or flag, patch for a fix. A changeset is only needed for a JS package the change touches.

## suggest-context

`design-data suggest-context --out <file>` (core: `sdk/core/src/context_suggest.rs`) writes a review file of proposed relationship contexts for the records SPEC-092 flags. It never writes data and refuses an `--out` inside the dataset. Tiers: `binding`, `sibling`, `template`; each run re-measures every tier against the existing human contexts (own context hidden) and marks template proposals `needs review` unless their basis reaches 80% main-word agreement. Applying a review file is a separate step.
