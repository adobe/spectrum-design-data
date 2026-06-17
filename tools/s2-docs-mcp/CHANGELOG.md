# @adobe/s2-docs-mcp

## 1.2.1

### Patch Changes

- [#1176](https://github.com/adobe/spectrum-design-data/pull/1176) [`559710e`](https://github.com/adobe/spectrum-design-data/commit/559710ebc3cb9867a2e608d55067bb8326e3b471) Thanks [@GarthDB](https://github.com/GarthDB)! - Automate SKILL.md metadata.version sync on release so CI passes without manual edits.
  - **scripts/sync-skill-version.mjs**: new shared script that rewrites `metadata.version`
    (and `metadata.designDataVersion` where present) in a SKILL.md frontmatter from the
    package's `package.json` version after `changeset version` runs.
  - **tools/design-data-skill/moon.yml**, **tools/design-data-agent-mcp/moon.yml**,
    **tools/s2-docs-mcp/moon.yml**: add a `version` moon task that calls the script so
    `moon run :version` (invoked by the `pnpm run version` release script) keeps SKILL.md
    in sync automatically.
  - **.github/ci-targets.json**: add the three new `version` tasks to `excludedFromCI`.

## 1.2.0

### Minor Changes

- [#1175](https://github.com/adobe/spectrum-design-data/pull/1175) [`a3b66f6`](https://github.com/adobe/spectrum-design-data/commit/a3b66f6c6fea32218b837d8fa87c0712ed4862d5) Thanks [@GarthDB](https://github.com/GarthDB)! - Add version metadata to agent skills; surface dataset provenance in MCP primer output.
  - **design-data/SKILL.md**: add `metadata.version` and `metadata.designDataVersion`
    to frontmatter (agentskills.io spec `metadata` block).
  - **design-data-agent/SKILL.md**: add `metadata.version` to frontmatter.
  - **s2-docs/SKILL.md**: add `metadata.version` to frontmatter.
  - **design-data-mcp primer**: return `provenance` object (includes `designDataVersion`).
  - **design-data-agent-mcp primer**: return `provenance` for dataset version metrics.
  - **skill-version.test.js** (all three packages): AVA tests assert SKILL.md
    `metadata.version` stays in sync with `package.json` on every version bump.

## 1.1.2

### Patch Changes

- [#835](https://github.com/adobe/spectrum-design-data/pull/835) [`ccdc5e0`](https://github.com/adobe/spectrum-design-data/commit/ccdc5e0d9ff32c8588a8df61629bd5c6b534bbe2) Thanks [@GarthDB](https://github.com/GarthDB)! - Drop the `commander` runtime dependency from `bin/s2-docs.js`. Claude Code
  plugin installs do not run `npm install` for the plugin's own
  `dependencies`, so the previous CLI crashed on first use with
  `Cannot find package 'commander'`. The rewritten bin uses Node's built-in
  `process.argv` for the same five subcommands (`list`, `get`, `search`,
  `use-case`, `stats`) and produces identical JSON output. Bumps
  `.claude-plugin/plugin.json` to `1.0.1` so existing users with the broken
  `1.0.0` cache get the fix automatically on `/plugin marketplace update`.

## 1.1.1

### Patch Changes

- [#834](https://github.com/adobe/spectrum-design-data/pull/834) [`66d423f`](https://github.com/adobe/spectrum-design-data/commit/66d423f80115f012f5626460c64c8c411cac018d) Thanks [@GarthDB](https://github.com/GarthDB)! - Conform `.claude-plugin/marketplace.json` to the Claude Code plugin marketplace schema so
  `/plugin marketplace add adobe/spectrum-design-data` succeeds. Adds required top-level `name`
  and `owner` fields, replaces the non-schema `path` field on the plugin entry with
  `source: "./tools/s2-docs-mcp"`, and updates the docs install snippet to the canonical
  `s2-docs@spectrum-design-data` form.

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
