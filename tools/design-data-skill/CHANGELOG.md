# @adobe/design-data-skill

## 2.2.12

### Patch Changes

- Updated dependencies []:
  - @adobe/design-data-mcp@1.14.3

## 2.2.11

### Patch Changes

- Updated dependencies []:
  - @adobe/design-data-mcp@1.14.2

## 2.2.10

### Patch Changes

- Updated dependencies []:
  - @adobe/design-data-mcp@1.14.1

## 2.2.9

### Patch Changes

- [#1891](https://github.com/adobe/spectrum-design-data/pull/1891) [`7f9c0ed`](https://github.com/adobe/spectrum-design-data/commit/7f9c0ed0b64d8105e72c6d2638b878af80d982ef) Thanks [@GarthDB](https://github.com/GarthDB)! - `design-data-query` and `design-data-suggest` now return compact, bounded output with final
  values. An agent run against these tools spent most of its tokens on tool output: `query
component=button` returned about 108,000 characters (146 full token objects, each named by a CI
  file path) and `property=*color*` about 1.3 million.

  `design-data-query` returns `{ total, shown, tokens }`, at most 25 tokens by default (`limit`,
  max 200), active before deprecated, with a hint to narrow the filter when more match. Each token
  has `name`, `value`, `layer`, `uuid` and its modes. `value` is the end of the alias chain, so
  `container-padding-small` shows `12px` and nothing needs a follow-up `uuid=` query. When the
  value differs by a mode the name does not pin (`accent-content-color-default` is a different
  colour in dark), the token has `values` by mode instead of `value`. `detail:
"full"` returns the old complete token objects. `design-data-suggest` returns the same compact
  shape plus `confidence`, with no `file` path.

  Breaking for callers that read the old array: `query` now returns an object, and `suggest`
  returns `name` instead of `tokenName`. The two sizes above become about 4,000 characters.

- [#1887](https://github.com/adobe/spectrum-design-data/pull/1887) [`92e77eb`](https://github.com/adobe/spectrum-design-data/commit/92e77eb81d9388f4f8cadafcde8d45a5bc1ee747) Thanks [@GarthDB](https://github.com/GarthDB)! - The plugin README and AI docs now say to install the plugin once, from one marketplace, and how
  to update it. A second copy (the Design AI Marketplace and this repository's marketplace both
  publish one) or a repo `mcp.json` entry registers a second `design-data` server and skill, and
  the client may expose none of them. They also list the Copilot app, Copilot CLI and Claude Code
  update steps; plugins do not update themselves.
- Updated dependencies [[`7e03e89`](https://github.com/adobe/spectrum-design-data/commit/7e03e8989899c867205be26e7beb74796d2a50fd), [`7f9c0ed`](https://github.com/adobe/spectrum-design-data/commit/7f9c0ed0b64d8105e72c6d2638b878af80d982ef)]:
  - @adobe/design-data-mcp@1.14.0

## 2.2.8

### Patch Changes

- Updated dependencies [[`1b01d40`](https://github.com/adobe/spectrum-design-data/commit/1b01d40baf3edafef26ca9e3a2d96c288e86cf31), [`374bbd8`](https://github.com/adobe/spectrum-design-data/commit/374bbd844ae6c08d2869730f6cd96d0f16741aeb)]:
  - @adobe/design-data-mcp@1.13.6

## 2.2.7

### Patch Changes

- Updated dependencies []:
  - @adobe/design-data-mcp@1.13.5

## 2.2.6

### Patch Changes

- Updated dependencies []:
  - @adobe/design-data-mcp@1.13.4

## 2.2.5

### Patch Changes

- Updated dependencies []:
  - @adobe/design-data-mcp@1.13.3

## 2.2.4

### Patch Changes

- Updated dependencies []:
  - @adobe/design-data-mcp@1.13.2

## 2.2.3

### Patch Changes

- Updated dependencies []:
  - @adobe/design-data-mcp@1.13.1

## 2.2.2

### Patch Changes

- Updated dependencies [[`0e290c0`](https://github.com/adobe/spectrum-design-data/commit/0e290c08a5542f0bf107d76c1e4a4e1d34284ba1)]:
  - @adobe/design-data-mcp@1.13.0

## 2.2.1

### Patch Changes

- [#1787](https://github.com/adobe/spectrum-design-data/pull/1787) [`46f7b73`](https://github.com/adobe/spectrum-design-data/commit/46f7b738f868b164aa5781c627687a08620ad07b) Thanks [@GarthDB](https://github.com/GarthDB)! - Document installing the plugin in the GitHub Copilot app, and that a new session is needed.
  - **`README.md`**: adds the Copilot app steps (Customize, marketplace, Install) and says to
    start a new session after installing, because an already-open session does not load the
    plugin's tools. Also says "all of them" instead of "all eight" for the read-only tools.

- Updated dependencies [[`544047f`](https://github.com/adobe/spectrum-design-data/commit/544047fe07b51c40928d23785f97147377fa948e)]:
  - @adobe/design-data-mcp@1.12.1

## 2.2.0

### Minor Changes

- [#1780](https://github.com/adobe/spectrum-design-data/pull/1780) [`bc6caa2`](https://github.com/adobe/spectrum-design-data/commit/bc6caa297e546eb5b26b0613d0d5e50a9f52b83e) Thanks [@GarthDB](https://github.com/GarthDB)! - Tell agents how PNG text gets its font.
  - **`skills/design-data/SKILL.md`**: documents `format: "png"`, `design-data-font-status` and
    a Fonts section: relay `font.fallback` and `font.help`, point Adobe employees to the Brand
    Center `.ttf`, ask for a path when the user says it is installed, and never say to download
    what was found.
  - **Plugin and marketplace descriptions**: mention SVG and PNG renders.

### Patch Changes

- Updated dependencies [[`bc6caa2`](https://github.com/adobe/spectrum-design-data/commit/bc6caa297e546eb5b26b0613d0d5e50a9f52b83e)]:
  - @adobe/design-data-mcp@1.12.0

## 2.1.0

### Minor Changes

- [#1775](https://github.com/adobe/spectrum-design-data/pull/1775) [`36b9c3d`](https://github.com/adobe/spectrum-design-data/commit/36b9c3d00a761a27cd9b50ad60da11b31a3de895) Thanks [@GarthDB](https://github.com/GarthDB)! - Document the new `design-data-visual-recipe` and `design-data-render` MCP tools in the skill.

### Patch Changes

- Updated dependencies [[`36b9c3d`](https://github.com/adobe/spectrum-design-data/commit/36b9c3d00a761a27cd9b50ad60da11b31a3de895)]:
  - @adobe/design-data-mcp@1.11.0

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
