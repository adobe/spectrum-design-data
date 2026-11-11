<!-- Copyright 2026 Adobe. All rights reserved. -->

# [**@adobe/design-data-skill**](https://github.com/adobe/design-data-skill)

Read-only Spectrum lookup plugin (skill + pinned MCP server config). Update `.mcp.json` only through `moon run design-data-skill:sync-pin`; tests keep the pin, manifest, and tool names consistent.

* **Audience:** consumer. **Lifecycle:** active. **npm:** published.
* Repository-wide rules are in [the root AGENTS.md](../../AGENTS.md). The [repository index](../../docs/repo-index.md) lists every project.
* `llms.txt` in this directory is generated; edit `README.md` or `.ai/inventory.json` and run `pnpm ai:sync`.
* This package is published: user-visible changes need a changeset.

## Commands

```bash
moon run design-data-skill:test
pnpm --filter @adobe/design-data-skill test
```
