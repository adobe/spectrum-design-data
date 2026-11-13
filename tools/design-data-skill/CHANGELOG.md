# @adobe/design-data-skill

## 2.0.3

### Patch Changes

- Updated dependencies []:
  - @adobe/design-data-mcp@1.10.4

## 2.0.2

### Patch Changes

- Updated dependencies []:
  - @adobe/design-data-mcp@1.10.3

## 2.0.1

### Patch Changes

- Updated dependencies []:
  - @adobe/design-data-mcp@1.10.2

## 2.0.0

### Major Changes

- [#1725](https://github.com/adobe/spectrum-design-data/pull/1725) [`34b4ad7`](https://github.com/adobe/spectrum-design-data/commit/34b4ad7670e311437fdcd7e4eb7c51a0bcbcd5bf) Thanks [@GarthDB](https://github.com/GarthDB)! - Rename the plugin to `spectrum-design-data` (install with
  `spectrum-design-data@spectrum-design-data`; the old `design-data@…` id no longer exists)
  and make it self-contained for distribution, including the
  Adobe Design AI Marketplace.
  - Bundle `.mcp.json`, which runs `@adobe/design-data-mcp` pinned to an exact
    version, so installing the plugin gives working tools with no manual MCP setup.
    `moon run :version` syncs the pin and the `plugin.json` version.
  - Fix `SKILL.md` tool names (plugin tools are
    `mcp__plugin_spectrum-design-data_design-data__*`), add the component-search and
    guideline tools, and drop the CLI and custom-dataset claims it never supported.
  - Replace relative links to sibling packages with absolute URLs.
  - Align the README, marketplace description, and AI docs page on Node.js
    > =20.12.0, the first-run download, snapshot freshness, and the context cost of
    > a bundled MCP server.
  - Depend on `@adobe/design-data-mcp` (`workspace:*`) so every MCP release also
    bumps and republishes the skill with the new pin.
  - Add packaging tests for the pin, manifest, tool names, and packed contents.

### Patch Changes

- Updated dependencies []:
  - @adobe/design-data-mcp@1.10.1

## 1.3.2

### Patch Changes

- [#1533](https://github.com/adobe/spectrum-design-data/pull/1533) [`6375e4b`](https://github.com/adobe/spectrum-design-data/commit/6375e4b83333f51f012d8f95df35a20d8a792340) Thanks [@GarthDB](https://github.com/GarthDB)! - Ship a generated `llms.txt` with each consumer-facing package (closes #1533).
  - **package.json (10 packages)**: add `llms.txt` to the npm `files` list.
  - **llms.txt**: generated from each README and `.ai/inventory.json` by `pnpm ai:sync`.

## 1.3.1

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

## 1.3.0

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

## 1.2.0

### Minor Changes

- [#1135](https://github.com/adobe/spectrum-design-data/pull/1135) [`43cc2c5`](https://github.com/adobe/spectrum-design-data/commit/43cc2c584e17dc6fceeb1de8cc11033fd393245e) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix review findings from Phase C MCP wasm migration.
  - **design-data-mcp**: replace hardcoded `indexed` field list with `getIndexedFields()`
    wasm call (was missing `$schema`); cache `Dataset.embedded()`; extract
    `scoreTokensByKeyword` helper; update suggest description to disclose keyword scoring.
  - **design-data-agent-mcp validate**: restore Layer-1 JSON-Schema validation via
    `@adobe/design-data-js/validate`; expose `schema_path` input; document exceptions limit.
  - **design-data-agent-mcp diff**: fix filter to use camelCase `oldName`/`newName`;
    extract `filterDiffByName` helper.
  - **design-data-agent-mcp authoring**: restore `schema_path` on `authoring_session_commit`
    and wire it to Layer-1 validation in `commitSession`.
  - **design-data-skill SKILL.md**: fix `allowed-tools` to correct tool names; rewrite
    body to use MCP tool descriptions instead of CLI `npx` commands.
  - **design-data-agent-mcp SKILL.md**: fix `allowed-tools` prefix to
    `mcp__design-data-agent__`; rewrite body to use MCP tool descriptions.
  - **sdk/core query.rs**: expose `indexed_fields()` public accessor.
  - **sdk/wasm registry.rs**: add `getIndexedFields()` wasm export.

## 1.1.0

### Minor Changes

- [#1076](https://github.com/adobe/spectrum-design-data/pull/1076) [`0ec2f98`](https://github.com/adobe/spectrum-design-data/commit/0ec2f98eb54ceb01d126a7f23006f80c9ce13b95) Thanks [@GarthDB](https://github.com/GarthDB)! - Publish design-data agent surface for Claude Code and Cursor distribution.
  - **tools/design-data-agent-mcp**: publish to npm with bundled `skills/` and
    `.claude-plugin/`; register as `design-data-agent` marketplace plugin.
  - **tools/design-data-skill**: add `@adobe/design-data-skill` npm package for
    versioned Spectrum skill installs.
