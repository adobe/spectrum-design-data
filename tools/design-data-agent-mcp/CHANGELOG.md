# @adobe/design-data-agent-mcp

## 1.8.4

### Patch Changes

- Updated dependencies [[`6717f58`](https://github.com/adobe/spectrum-design-data/commit/6717f58d3c0e6ed756d15a540e0482155e23f624)]:
  - @adobe/spectrum-design-data@0.12.0

## 1.8.3

### Patch Changes

- Updated dependencies [[`f9f339c`](https://github.com/adobe/spectrum-design-data/commit/f9f339cabb15ecc27170c7230a9d5f7fdafea00c)]:
  - @adobe/spectrum-design-data@0.11.0

## 1.8.2

### Patch Changes

- Updated dependencies [[`a214eba`](https://github.com/adobe/spectrum-design-data/commit/a214eba18b230b24cbf99f0ca05cebbd70bb83b5), [`e6a8046`](https://github.com/adobe/spectrum-design-data/commit/e6a80463a9fc5603afaf14898e015056816f3670)]:
  - @adobe/spectrum-design-data@0.10.0

## 1.8.1

### Patch Changes

- Updated dependencies [[`e77c2b3`](https://github.com/adobe/spectrum-design-data/commit/e77c2b3519e75a07815c2905ac0bd0d7bef042c2), [`555047a`](https://github.com/adobe/spectrum-design-data/commit/555047a1c54366342a3a1fc550918b14cb3d5820), [`84c3f09`](https://github.com/adobe/spectrum-design-data/commit/84c3f09d7b48744c24d45e63ecba7f07cc94e5fd), [`14d3b48`](https://github.com/adobe/spectrum-design-data/commit/14d3b48b7efd80f06f42587b05b230fa2f353a6e), [`519c444`](https://github.com/adobe/spectrum-design-data/commit/519c4443474e01f807f383fc482cabe30fa1a456), [`9f5401f`](https://github.com/adobe/spectrum-design-data/commit/9f5401f1281932e7efff0bcbdbc50f69d2f3fea5), [`204d1ad`](https://github.com/adobe/spectrum-design-data/commit/204d1ad43300d516d75e384509c33b480342b217), [`46449db`](https://github.com/adobe/spectrum-design-data/commit/46449dbcbdbeffb256fb857d3f878b8b376ccb91), [`b97a7ef`](https://github.com/adobe/spectrum-design-data/commit/b97a7ef5a205969f83eeca421e75983b8b214a72), [`96ec195`](https://github.com/adobe/spectrum-design-data/commit/96ec1957d0e7ad064c5d25b5b876c2fd3d61c450), [`d7976e0`](https://github.com/adobe/spectrum-design-data/commit/d7976e05dc1d70b8330ff716f35d74f6b2f8fcbb), [`62e74d7`](https://github.com/adobe/spectrum-design-data/commit/62e74d7f4d59bcc3e63fbc5b7c594f65ef78b024), [`b4f79db`](https://github.com/adobe/spectrum-design-data/commit/b4f79db78d8b889b46b98d0fc26d424c1d4fe5fe), [`ecd5f38`](https://github.com/adobe/spectrum-design-data/commit/ecd5f38dd679730bf1f2b9b3980cd5032ac4a9f1), [`62e74d7`](https://github.com/adobe/spectrum-design-data/commit/62e74d7f4d59bcc3e63fbc5b7c594f65ef78b024), [`62e74d7`](https://github.com/adobe/spectrum-design-data/commit/62e74d7f4d59bcc3e63fbc5b7c594f65ef78b024), [`8d8bf09`](https://github.com/adobe/spectrum-design-data/commit/8d8bf0904e716ed86b10f890251980f73f0215c7), [`02cc09f`](https://github.com/adobe/spectrum-design-data/commit/02cc09fc2a40c8b93ff759dec5573d360815c707)]:
  - @adobe/spectrum-design-data@0.9.0

## 1.8.0

### Minor Changes

- [#1198](https://github.com/adobe/spectrum-design-data/pull/1198) [`70c1685`](https://github.com/adobe/spectrum-design-data/commit/70c1685ec68f483b23ca0f971de159b3679df992) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(authoring): B6 — MCP authoring parity via CLI shell-out (closes #122.6).
  - **tools/design-data-agent-mcp/src/tools/authoring.js**: rewritten as CLI adapters; adds
    10 new tools (edit_token, deprecate_token, rename_token, rewire_alias, remove_token,
    add_mode, rename_mode, remove_mode, create_mode_set, remove_mode_set); all session tools
    now shell out to `design-data authoring-session` so commit writes a cascade element;
    classification is catalog-aware via the CLI's validate_classification.
  - **tools/design-data-agent-mcp/src/tools/write.js**: repointed to `design-data write` CLI.
  - **tools/design-data/src/write.js** (removed): legacy flat-file helpers superseded by cascade.
  - **tools/design-data/src/session.js** (removed): in-process session superseded by CLI;
    exported API removed from @adobe/design-data (breaking).

- [#1201](https://github.com/adobe/spectrum-design-data/pull/1201) [`11c4d5a`](https://github.com/adobe/spectrum-design-data/commit/11c4d5a937064ba24f69437c59ab5ad1bfbe5f8c) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(authoring): Phase C — create/edit authoring for non-token data categories.
  - **tools/design-data-agent-mcp**: adds `data_create` and `data_edit` MCP tools for
    components, fields, registry, mode-sets, and guidelines; delegate to the CLI.
  - **packages/design-data/AUTHORING.md**: documents the new `design-data data create|edit`
    CLI commands and the `data_create`/`data_edit` MCP tools.

### Patch Changes

- Updated dependencies [[`c923bd2`](https://github.com/adobe/spectrum-design-data/commit/c923bd27bba0ee484ba251d9baf6a63c5cfc68d0), [`e38c4e1`](https://github.com/adobe/spectrum-design-data/commit/e38c4e19f97aa590991b0c1ac40c2e1b24620cde), [`f9585da`](https://github.com/adobe/spectrum-design-data/commit/f9585daf01d5dab651793ce6f1d816f320623204), [`09b3970`](https://github.com/adobe/spectrum-design-data/commit/09b39705547954ba44dabe41c70c5b76a6f8b43e), [`82bb4c4`](https://github.com/adobe/spectrum-design-data/commit/82bb4c46f67a0b4a1a74fb18514d53925f85a3ca), [`212ec82`](https://github.com/adobe/spectrum-design-data/commit/212ec825e25c5ce7ae7342072522423b3ce07483), [`70c1685`](https://github.com/adobe/spectrum-design-data/commit/70c1685ec68f483b23ca0f971de159b3679df992), [`11c4d5a`](https://github.com/adobe/spectrum-design-data/commit/11c4d5a937064ba24f69437c59ab5ad1bfbe5f8c), [`0297e7e`](https://github.com/adobe/spectrum-design-data/commit/0297e7ee77e102a3756302f83ab9236cd142ee58), [`5e7db36`](https://github.com/adobe/spectrum-design-data/commit/5e7db3605547e680f777fc345f0005d7e3637a7e), [`73e5bbf`](https://github.com/adobe/spectrum-design-data/commit/73e5bbfcb90bf9b0672bf6d32e2aee1cad9deca4), [`4218d6a`](https://github.com/adobe/spectrum-design-data/commit/4218d6a1694db70cb37f656cd0250e306e48912d), [`035a1f9`](https://github.com/adobe/spectrum-design-data/commit/035a1f95d909f8e443a5e51baee6e30d11eedde5), [`bb9421a`](https://github.com/adobe/spectrum-design-data/commit/bb9421a0d96067c2cd3a335d982a94b845c98570)]:
  - @adobe/spectrum-design-data@0.8.0
  - @adobe/design-data@3.0.0

## 1.7.2

### Patch Changes

- Updated dependencies [[`dcf0832`](https://github.com/adobe/spectrum-design-data/commit/dcf083214d56989817db192801638e3ec20e2306)]:
  - @adobe/spectrum-design-data@0.7.1

## 1.7.1

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

## 1.7.0

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

## 1.6.6

### Patch Changes

- Updated dependencies [[`a23dafb`](https://github.com/adobe/spectrum-design-data/commit/a23dafb1805dac8203baba669c61085133160454), [`a23dafb`](https://github.com/adobe/spectrum-design-data/commit/a23dafb1805dac8203baba669c61085133160454)]:
  - @adobe/spectrum-design-data@0.7.0

## 1.6.5

### Patch Changes

- Updated dependencies [[`e7fbcb0`](https://github.com/adobe/spectrum-design-data/commit/e7fbcb00b6afe1c1a272ed72b7ed22c08fe8e978), [`e7fbcb0`](https://github.com/adobe/spectrum-design-data/commit/e7fbcb00b6afe1c1a272ed72b7ed22c08fe8e978)]:
  - @adobe/spectrum-design-data@0.6.0

## 1.6.4

### Patch Changes

- Updated dependencies [[`f84bce2`](https://github.com/adobe/spectrum-design-data/commit/f84bce215d20f1bc8b109f3f23b15bfab6b239d0)]:
  - @adobe/spectrum-design-data@0.4.0

## 1.6.3

### Patch Changes

- Updated dependencies [[`cece05d`](https://github.com/adobe/spectrum-design-data/commit/cece05de03dd8b43cfeb697d045eb4302a34b26c)]:
  - @adobe/design-data-wasm@0.4.0
  - @adobe/design-data@2.0.3

## 1.6.2

### Patch Changes

- Updated dependencies [[`f829426`](https://github.com/adobe/spectrum-design-data/commit/f8294264fdcc5905a8d33dbdde391d8d452597b6), [`f829426`](https://github.com/adobe/spectrum-design-data/commit/f8294264fdcc5905a8d33dbdde391d8d452597b6)]:
  - @adobe/design-data@2.0.2
  - @adobe/design-data-wasm@0.3.0

## 1.6.1

### Patch Changes

- Updated dependencies [[`87f07af`](https://github.com/adobe/spectrum-design-data/commit/87f07af51cfdaa80788e943cd948232d78e6cfd7), [`87f07af`](https://github.com/adobe/spectrum-design-data/commit/87f07af51cfdaa80788e943cd948232d78e6cfd7)]:
  - @adobe/design-data@2.0.1
  - @adobe/design-data-wasm@0.2.0

## 1.6.0

### Minor Changes

- [#1139](https://github.com/adobe/spectrum-design-data/pull/1139) [`b08627f`](https://github.com/adobe/spectrum-design-data/commit/b08627f0841925dea5781a08946420ab38ac8b35) Thanks [@GarthDB](https://github.com/GarthDB)! - Migrate `primer` and `describe_component` read tools off the native CLI to in-process wasm.
  - **tools/read.js**: replace `runCli` for `primer` with wasm `getWasm`/`getDataset`/`getFieldValues`
    composing the primer response; matches sibling `design-data-mcp` pattern.
  - **tools/read.js**: replace `runCli` for `describe_component` with direct filesystem read;
    add `validateComponentId` (mirrors `component.rs:validate_id`) to block path traversal.
  - **test/read.test.js**: tests for primer shape, id-validation edge cases, and not-found
    error listing available components.
  - **package.json**, **README.md**: note that the `design-data` binary is now only needed
    for `authoring_session_step_intent`.

## 1.5.0

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

### Patch Changes

- [#1138](https://github.com/adobe/spectrum-design-data/pull/1138) [`a393c71`](https://github.com/adobe/spectrum-design-data/commit/a393c7132af49b92852e88b2632451f61a1e67bb) Thanks [@GarthDB](https://github.com/GarthDB)! - Rename `@adobe/design-data-js` → `@adobe/design-data`; remove binary npm packages.
  - **@adobe/design-data** (was `@adobe/design-data-js`): package renamed; all
    import paths (`@adobe/design-data/load`, `/write`, `/session`, `/validate`) are
    unchanged. Update your `package.json` dependency name to `@adobe/design-data`.
  - **sdk/npm/\***: platform binary packages (`darwin-arm64`, `darwin-x64`,
    `linux-x64`, `win32-x64`) and the CLI npm wrapper removed; use the Rust CLI
    binary directly or the wasm package instead.
  - **tools/design-data-agent-mcp**: dependency name updated to `@adobe/design-data`.

- Updated dependencies [[`a393c71`](https://github.com/adobe/spectrum-design-data/commit/a393c7132af49b92852e88b2632451f61a1e67bb), [`a393c71`](https://github.com/adobe/spectrum-design-data/commit/a393c7132af49b92852e88b2632451f61a1e67bb), [`a393c71`](https://github.com/adobe/spectrum-design-data/commit/a393c7132af49b92852e88b2632451f61a1e67bb)]:
  - @adobe/design-data-wasm@0.1.0
  - @adobe/design-data@2.0.0

## 1.4.1

### Patch Changes

- Updated dependencies [[`60a4835`](https://github.com/adobe/spectrum-design-data/commit/60a4835e245965639a4ac89b41d2884dd63a0bbb)]:
  - @adobe/spectrum-design-data@0.3.0

## 1.4.0

### Minor Changes

- [#1120](https://github.com/adobe/spectrum-design-data/pull/1120) [`5d99d24`](https://github.com/adobe/spectrum-design-data/commit/5d99d2440f55e37cad5ab972749945fff42057f2) Thanks [@GarthDB](https://github.com/GarthDB)! - Resolve design data paths independently of the working directory so MCP tools
  work when launched from a monorepo subdirectory (closes #1109).
  - **package.json**: depend on `@adobe/spectrum-design-data` (`workspace:*`) so the
    data package is linked into the server.
  - **src/config.js**: when no env override is set, resolve `tokens`/`components`/
    `fields` from the `@adobe/spectrum-design-data` package via Node module
    resolution (CWD-independent). Explicit `DESIGN_DATA_*` env overrides still win;
    relative values are anchored to the new `DESIGN_DATA_ROOT` (or the server
    package root when unset).
  - **src/cli.js**: spawn the `design-data` CLI with `cwd` set to the resolved root.
  - **moon.yml / .moon/workspace.yml**: register the project and add
    `dependsOn: ["design-data"]` so moon orders tasks and syncs the dependency.
  - **README.md**: document the resolution precedence and `DESIGN_DATA_ROOT`.

## 1.3.1

### Patch Changes

- [#1102](https://github.com/adobe/spectrum-design-data/pull/1102) [`f163915`](https://github.com/adobe/spectrum-design-data/commit/f163915c3bbe76a8eae1a047f3148ec7f3386b2c) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix the MCP server failing to start when launched via npx or a node_modules/.bin shim.
  - **src/index.js**: the entry-point guard compared `process.argv[1]` to the
    module URL directly, which never matched when invoked through a symlink (npx,
    pnpm `.bin`). The server exited 0 without starting, surfacing to clients as
    `Failed to reconnect: -32000`. The check now compares resolved real paths.

## 1.3.0

### Minor Changes

- [#1076](https://github.com/adobe/spectrum-design-data/pull/1076) [`0ec2f98`](https://github.com/adobe/spectrum-design-data/commit/0ec2f98eb54ceb01d126a7f23006f80c9ce13b95) Thanks [@GarthDB](https://github.com/GarthDB)! - Publish design-data agent surface for Claude Code and Cursor distribution.
  - **tools/design-data-agent-mcp**: publish to npm with bundled `skills/` and
    `.claude-plugin/`; register as `design-data-agent` marketplace plugin.
  - **tools/design-data-skill**: add `@adobe/design-data-skill` npm package for
    versioned Spectrum skill installs.

## 1.2.0

### Minor Changes

- [#997](https://github.com/adobe/spectrum-design-data/pull/997) [`efd7737`](https://github.com/adobe/spectrum-design-data/commit/efd773751477875bb9a68c18fa8176e5c2350bae) Thanks [@GarthDB](https://github.com/GarthDB)! - Calibrate suggest threshold and wire reuse-first banner (RFC #973 Q1).
  - **sdk/core/src/authoring/session.rs**: replace `ALIAS_THRESHOLD = 0.5` placeholder
    with `alias_threshold()` (default 0.35, overridable via `DESIGN_DATA_ALIAS_THRESHOLD`);
    calibrated against `packages/tokens/src`.
  - **sdk/core/tests/suggest_calibration.rs**: new benchmark — positive matches 0.6–1.0,
    nonsense 0.0, threshold 0.35 sits cleanly between.
  - **sdk/tui/src/wizard.rs**: `refresh_suggestions` sets `can_alias` via `alias_threshold()`.
  - **sdk/tui/src/main.rs**: `render_intent_screen` shows RFC §3.10 reuse-first banner
    (accent-colored, 2-line) when `can_alias` is true.

- [#995](https://github.com/adobe/spectrum-design-data/pull/995) [`3b6c20f`](https://github.com/adobe/spectrum-design-data/commit/3b6c20f483443e2627193cb8074bd1f5fd498bfb) Thanks [@GarthDB](https://github.com/GarthDB)! - Add MCP authoring-session tools — wizard state machine for agents (RFC #973 Q4).
  - **sdk/core/src/authoring/draft.rs** (new): serializable DTOs shared between
    TUI wizard and MCP sessions.
  - **sdk/core/src/authoring/session.rs** (new): on-disk session state machine
    (`start`, `step_intent`, `step_classification`, `step_values`,
    `commit`, `cancel`, `get`, `list`).
  - **sdk/tui/src/wizard.rs**: import `WizardScreen`, `WizardPath`, `ValueKind`
    from core; remove local definitions.
  - **sdk/cli/src/authoring.rs** (new): `authoring-session` CLI subcommand with
    JSON output.
  - **tools/design-data-agent-mcp/src/tools/authoring.js** (new): 8 MCP tools
    wrapping the CLI subcommand.

## 1.1.0

### Minor Changes

- [#874](https://github.com/adobe/spectrum-design-data/pull/874) [`b62360b`](https://github.com/adobe/spectrum-design-data/commit/b62360b657a083578d0db3d10a1d406d00c99204) Thanks [@GarthDB](https://github.com/GarthDB)! - feat: add design-data-agent-mcp MCP server (Phase 8.3)

### Patch Changes

- [#876](https://github.com/adobe/spectrum-design-data/pull/876) [`5409f6c`](https://github.com/adobe/spectrum-design-data/commit/5409f6c98f434f165e527428034d56af96bc7948) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(skill): add Claude Code Agent Skill for design-data (Phase 8.4)
