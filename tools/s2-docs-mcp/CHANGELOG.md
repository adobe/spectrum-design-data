# @adobe/s2-docs-mcp

## 1.1.0

### Minor Changes

- [`84adce8`](https://github.com/adobe/spectrum-design-data/commit/84adce874523eec87ae314561c133482435e42f3) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(s2-docs-mcp): add agent skill plugin, CLI bin, and bundled docs

  Adds a Claude Code / Cursor Agent Skill plugin and a `s2-docs` CLI so the
  package works via `npx` without a local repo clone.
  - `bin/s2-docs.js` — CLI with list/get/search/use-case/stats subcommands
  - `skills/s2-docs/SKILL.md` — auto-triggers on Spectrum intent; Cursor-compatible
  - `tasks/bundleDocs.js` + `prepublishOnly` — bundles docs into `data/` at publish
  - Fix: `src/data/docs.js` resolves bundled data first, repo path as dev fallback

## 1.0.1

### Patch Changes

- [#751](https://github.com/adobe/spectrum-design-data/pull/751) [`42e6257`](https://github.com/adobe/spectrum-design-data/commit/42e62574ef03bc8f9a66ebde48e8e60625e7bd7c) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix MCP spec compliance for strict clients like Kiro and Claude
  - Remove invalid `required: true` from individual property definitions
    in tool `inputSchema` objects (JSON Schema requires `required` as a
    string array on the parent object, not a boolean on properties)
  - Upgrade `@modelcontextprotocol/sdk` from `^0.5.0` to `^1.27.1`
  - Return tool execution errors as results with `isError: true` instead of throwing (per MCP spec)
  - Read server version dynamically from `package.json` instead of hardcoding

## 1.0.0

### Major Changes

- [#697](https://github.com/adobe/spectrum-design-data/pull/697) [`d1a8659`](https://github.com/adobe/spectrum-design-data/commit/d1a865919459a294995cf1f64e07bc960ddbd493) Thanks [@GarthDB](https://github.com/GarthDB)! - Initial release of S2 Docs MCP server and Spectrum 2 documentation.

  This adds comprehensive Spectrum 2 documentation to the monorepo:
  - **102 markdown pages** with YAML frontmatter scraped from s2.spectrum.corp.adobe.com
  - **MCP server** (`@adobe/s2-docs-mcp`) providing AI assistants with structured access to
    S2 component docs via tools: list-s2-components, get-s2-component, search-s2-docs,
    find-s2-component-by-use-case, get-s2-stats
  - **Transform scripts** (`tools/s2-docs-transformer`) for maintaining frontmatter and scraping
    workflow
