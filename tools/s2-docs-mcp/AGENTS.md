<!-- Copyright 2026 Adobe. All rights reserved. -->

# [**@adobe/s2-docs-mcp**](https://github.com/adobe/s2-docs-mcp)

MCP server for Spectrum 2 documentation.

* **Audience:** consumer. **Lifecycle:** active. **npm:** published.
* Repository-wide rules are in [the root AGENTS.md](../../AGENTS.md). The [repository index](../../docs/repo-index.md) lists every project.
* `llms.txt` in this directory is generated; edit `README.md` or `.ai/inventory.json` and run `pnpm ai:sync`.
* This package is published: user-visible changes need a changeset.

## Commands

```bash
moon run s2-docs-mcp:test
moon run s2-docs-mcp:build
pnpm --filter @adobe/s2-docs-mcp test
```
