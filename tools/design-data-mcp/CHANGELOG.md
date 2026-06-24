# @adobe/design-data-mcp

## 1.7.2

### Patch Changes

- Updated dependencies [[`dcf0832`](https://github.com/adobe/spectrum-design-data/commit/dcf083214d56989817db192801638e3ec20e2306)]:
  - @adobe/spectrum-design-data@0.7.1

## 1.7.1

### Patch Changes

- [#1181](https://github.com/adobe/spectrum-design-data/pull/1181) [`97e8afb`](https://github.com/adobe/spectrum-design-data/commit/97e8afbd01700a5ce7d5476bee1053a19d8ba554) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix MCPB bundle startup, harden path validation, slim bundle, add regression tests.
  - **scripts/generate-mcpb.mjs**: Fix `resolvePackageDir` to walk up to the true
    package root (ancestor `package.json` with matching `name`), avoiding nested
    `dist/cjs/package.json` stubs. Fixes missing zod, hono, jose, and all MCP SDK
    transitives. Workspace packages now copied using their `files` allowlist — drops
    Rust sources, devDep `node_modules`, and `pkg/web`; bundle shrinks 9.8 MB → 5.7 MB.
  - **src/tools/design-data.js**: Resolve final path and assert containment within the
    intended subdirectory before reading; rejects `..` traversal and absolute-path escapes.
  - **test/bundle-contents.test.js**: Assert bundle contains only what it needs — zod
    with `./v4` export, wasm + data JSON present; `ava`, nested `node_modules`, `pkg/web`,
    Rust `src/` absent.
  - **test/bundle-smoke.test.js** + **test/helpers/ensure-bundle.js**: Self-generating
    offline smoke test (initialize + tools/list); never silently skips.
  - **moon.yml** + **.moon/workspace.yml** + **.github/ci-targets.json**: Register as
    moon project; add `stage` task; wire `design-data-mcp:test` into CI.

- Updated dependencies []:
  - @adobe/spectrum-design-data@0.7.0

## 1.7.0

### Minor Changes

- [`6efe209`](https://github.com/adobe/spectrum-design-data/commit/6efe209fe93f09d76b379226fa4d17a2eab3751a) Thanks [@GarthDB](https://github.com/GarthDB)! - Package as a Claude Desktop Extension for one-click install from the Anthropic Software Directory.
  - **src/tools/design-data.js**: Add `annotations` (`title`, `readOnlyHint`, `openWorldHint`)
    to all 7 tools per Anthropic Software Directory policy.
  - **src/index.js**: Forward `annotations` in `ListToolsRequestSchema`; fix stale docstring.
  - **scripts/generate-mcpb.mjs**: New script that stages the bundle — vendors deps via
    recursive `copyDependencyTree` (dereferenced, so pnpm workspace packages copy cleanly),
    generates `icon.png` from `site/adobe_logo.svg` via `sharp` (512×512, transparent bg),
    and writes a `manifest.json` (manifest_version 0.3) auto-versioned from `package.json`.
  - **moon.yml**: Add `bundle` task (`node scripts/generate-mcpb.mjs` → `mcpb validate`
    → `mcpb pack` → `dist/design-data.mcpb`).
  - **package.json**: Add `sharp` devDependency for the generator script.
  - **README.md**: Document all 7 tools (was 5); add Extension install section.

### Patch Changes

- [#1180](https://github.com/adobe/spectrum-design-data/pull/1180) [`1a4d4f7`](https://github.com/adobe/spectrum-design-data/commit/1a4d4f7bbac7d8f6c1d7f9949613d90f66116656) Thanks [@GarthDB](https://github.com/GarthDB)! - Post-review cleanup for the Claude Desktop Extension packaging.
  - **scripts/generate-mcpb.mjs**: Remove unused `pathToFileURL` import;
    replace `npx @anthropic-ai/mcpb` console hints with `pnpm exec mcpb`;
    add comment on flat-dedup assumption in `copyDependencyTree`.
  - **moon.yml**: Replace `npx --yes @anthropic-ai/mcpb` with `pnpm exec mcpb`
    for deterministic builds without a per-run network fetch.
  - **package.json**: Pin `@anthropic-ai/mcpb@^2.1.2` as a devDependency;
    update `description` and `keywords` to remove stale CLI references.
  - **test/design-data.test.js**: Assert all 7 tools carry correct MCP
    annotations (`readOnlyHint`, `openWorldHint`, `title`).
  - **test/generate-mcpb.test.js**: Smoke test that runs the bundle generator
    and asserts staging structure and manifest correctness.

## 1.6.0

### Minor Changes

- [#1157](https://github.com/adobe/spectrum-design-data/pull/1157) [`a23dafb`](https://github.com/adobe/spectrum-design-data/commit/a23dafb1805dac8203baba669c61085133160454) Thanks [@GarthDB](https://github.com/GarthDB)! - Add `design-data-guideline` and `design-data-guideline-list` MCP tools.
  - **design-data-guideline-list**: lists available guideline pages from `manifest.json`;
    supports optional `category` filter (designing, fundamentals, developing, support).
  - **design-data-guideline**: fetches a full guideline document by kebab-case ID.
  - **design-data-primer**: now includes a `guidelines` summary (count + categories).
  - **loadDataFile**: extracted shared helper used by both component and guideline loaders.

### Patch Changes

- Updated dependencies [[`a23dafb`](https://github.com/adobe/spectrum-design-data/commit/a23dafb1805dac8203baba669c61085133160454), [`a23dafb`](https://github.com/adobe/spectrum-design-data/commit/a23dafb1805dac8203baba669c61085133160454)]:
  - @adobe/spectrum-design-data@0.7.0

## 1.5.0

### Minor Changes

- [`e7fbcb0`](https://github.com/adobe/spectrum-design-data/commit/e7fbcb00b6afe1c1a272ed72b7ed22c08fe8e978) Thanks [@GarthDB](https://github.com/GarthDB)! - Add `design-data-guideline` and `design-data-guideline-list` MCP tools.
  - **design-data-guideline-list**: lists available guideline pages from `manifest.json`;
    supports optional `category` filter (designing, fundamentals, developing, support).
  - **design-data-guideline**: fetches a full guideline document by kebab-case ID.
  - **design-data-primer**: now includes a `guidelines` summary (count + categories).
  - **loadDataFile**: extracted shared helper used by both component and guideline loaders.

### Patch Changes

- Updated dependencies [[`e7fbcb0`](https://github.com/adobe/spectrum-design-data/commit/e7fbcb00b6afe1c1a272ed72b7ed22c08fe8e978), [`e7fbcb0`](https://github.com/adobe/spectrum-design-data/commit/e7fbcb00b6afe1c1a272ed72b7ed22c08fe8e978)]:
  - @adobe/spectrum-design-data@0.6.0

## 1.4.2

### Patch Changes

- Updated dependencies [[`f84bce2`](https://github.com/adobe/spectrum-design-data/commit/f84bce215d20f1bc8b109f3f23b15bfab6b239d0)]:
  - @adobe/spectrum-design-data@0.4.0

## 1.4.1

### Patch Changes

- Updated dependencies [[`cece05d`](https://github.com/adobe/spectrum-design-data/commit/cece05de03dd8b43cfeb697d045eb4302a34b26c)]:
  - @adobe/design-data-wasm@0.4.0

## 1.4.0

### Minor Changes

- [#1143](https://github.com/adobe/spectrum-design-data/pull/1143) [`f829426`](https://github.com/adobe/spectrum-design-data/commit/f8294264fdcc5905a8d33dbdde391d8d452597b6) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(sdk): expose Dataset.suggest() on wasm surface; swap MCP suggest to wasm.
  - **sdk/wasm/src/types.rs**: add `SuggestResult` DTO (camelCase tsify) and
    `SuggestResultArray` wrapper; `From<SuggestionResult>` conversion.
  - **sdk/wasm/src/dataset.rs**: add `Dataset.suggest(intent, propertyHint, limit)`
    binding over `design_data_core::suggest::suggest` — Jaccard scoring in-process,
    no full token allocation on the JS side.
  - **tools/design-data-mcp**: replace `ds.query("") + scoreTokensByKeyword` with
    `ds.suggest(intent, undefined, limit)`; remove dead `scoreTokensByKeyword` export.
    Output shape changes to the richer Rust shape (`tokenName`, `file`, `layer`,
    `nameObject`, `value`, `confidence`, `tokenUuid`).

### Patch Changes

- Updated dependencies [[`f829426`](https://github.com/adobe/spectrum-design-data/commit/f8294264fdcc5905a8d33dbdde391d8d452597b6)]:
  - @adobe/design-data-wasm@0.3.0

## 1.3.0

### Minor Changes

- [#1141](https://github.com/adobe/spectrum-design-data/pull/1141) [`87f07af`](https://github.com/adobe/spectrum-design-data/commit/87f07af51cfdaa80788e943cd948232d78e6cfd7) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(sdk): expose Dataset.suggest() on wasm surface; swap MCP suggest to wasm.
  - **sdk/wasm/src/types.rs**: add `SuggestResult` DTO (camelCase tsify) and
    `SuggestResultArray` wrapper; `From<SuggestionResult>` conversion.
  - **sdk/wasm/src/dataset.rs**: add `Dataset.suggest(intent, propertyHint, limit)`
    binding over `design_data_core::suggest::suggest` — Jaccard scoring in-process,
    no full token allocation on the JS side.
  - **tools/design-data-mcp**: replace `ds.query("") + scoreTokensByKeyword` with
    `ds.suggest(intent, undefined, limit)`; remove dead `scoreTokensByKeyword` export.
    Output shape changes to the richer Rust shape (`tokenName`, `file`, `layer`,
    `nameObject`, `value`, `confidence`, `tokenUuid`).

### Patch Changes

- Updated dependencies [[`87f07af`](https://github.com/adobe/spectrum-design-data/commit/87f07af51cfdaa80788e943cd948232d78e6cfd7)]:
  - @adobe/design-data-wasm@0.2.0

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

### Patch Changes

- Updated dependencies [[`a393c71`](https://github.com/adobe/spectrum-design-data/commit/a393c7132af49b92852e88b2632451f61a1e67bb), [`a393c71`](https://github.com/adobe/spectrum-design-data/commit/a393c7132af49b92852e88b2632451f61a1e67bb)]:
  - @adobe/design-data-wasm@0.1.0

## 1.1.0

### Minor Changes

- [#1065](https://github.com/adobe/spectrum-design-data/pull/1065) [`5e9f126`](https://github.com/adobe/spectrum-design-data/commit/5e9f126731f1ad84a7c25ce688e8853bda8af46b) Thanks [@GarthDB](https://github.com/GarthDB)! - Initial release of `@adobe/design-data-mcp` — an MCP server that wraps the
  `@adobe/design-data` CLI as five tools for Cursor, Claude Desktop, and other
  MCP-compatible agents: `design-data-primer`, `design-data-query`,
  `design-data-suggest`, `design-data-component`, `design-data-resolve`.
