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
