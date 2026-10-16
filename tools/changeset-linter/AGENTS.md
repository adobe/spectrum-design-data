<!-- Copyright 2026 Adobe. All rights reserved. -->

# [**@adobe/changeset-linter**](https://github.com/adobe/changeset-linter)

Enforces concise changeset files. Published, but intended for this repository.

* **Audience:** maintainer. **Lifecycle:** active. **npm:** published.
* Repository-wide rules are in [the root AGENTS.md](../../AGENTS.md). The [repository index](../../docs/repo-index.md) lists every project.
* This package is published: user-visible changes need a changeset.

## Commands

```bash
pnpm --filter @adobe/changeset-linter test
```

## Notes

Published to npm but used for this repository's own changeset checks. Run `node tools/changeset-linter/src/cli.js check --fail-on-warnings` from the repository root.
