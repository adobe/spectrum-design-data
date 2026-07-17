# @adobe/design-data-mcp

## 1.7.7

### Patch Changes

- Updated dependencies [[`6717f58`](https://github.com/adobe/spectrum-design-data/commit/6717f58d3c0e6ed756d15a540e0482155e23f624)]:
  - @adobe/spectrum-design-data@0.12.0

## 1.7.6

### Patch Changes

- Updated dependencies [[`f9f339c`](https://github.com/adobe/spectrum-design-data/commit/f9f339cabb15ecc27170c7230a9d5f7fdafea00c)]:
  - @adobe/spectrum-design-data@0.11.0

## 1.7.5

### Patch Changes

- Updated dependencies [[`a214eba`](https://github.com/adobe/spectrum-design-data/commit/a214eba18b230b24cbf99f0ca05cebbd70bb83b5), [`e6a8046`](https://github.com/adobe/spectrum-design-data/commit/e6a80463a9fc5603afaf14898e015056816f3670)]:
  - @adobe/spectrum-design-data@0.10.0

## 1.7.4

### Patch Changes

- Updated dependencies [[`e77c2b3`](https://github.com/adobe/spectrum-design-data/commit/e77c2b3519e75a07815c2905ac0bd0d7bef042c2), [`555047a`](https://github.com/adobe/spectrum-design-data/commit/555047a1c54366342a3a1fc550918b14cb3d5820), [`84c3f09`](https://github.com/adobe/spectrum-design-data/commit/84c3f09d7b48744c24d45e63ecba7f07cc94e5fd), [`14d3b48`](https://github.com/adobe/spectrum-design-data/commit/14d3b48b7efd80f06f42587b05b230fa2f353a6e), [`519c444`](https://github.com/adobe/spectrum-design-data/commit/519c4443474e01f807f383fc482cabe30fa1a456), [`9f5401f`](https://github.com/adobe/spectrum-design-data/commit/9f5401f1281932e7efff0bcbdbc50f69d2f3fea5), [`204d1ad`](https://github.com/adobe/spectrum-design-data/commit/204d1ad43300d516d75e384509c33b480342b217), [`46449db`](https://github.com/adobe/spectrum-design-data/commit/46449dbcbdbeffb256fb857d3f878b8b376ccb91), [`b97a7ef`](https://github.com/adobe/spectrum-design-data/commit/b97a7ef5a205969f83eeca421e75983b8b214a72), [`96ec195`](https://github.com/adobe/spectrum-design-data/commit/96ec1957d0e7ad064c5d25b5b876c2fd3d61c450), [`d7976e0`](https://github.com/adobe/spectrum-design-data/commit/d7976e05dc1d70b8330ff716f35d74f6b2f8fcbb), [`62e74d7`](https://github.com/adobe/spectrum-design-data/commit/62e74d7f4d59bcc3e63fbc5b7c594f65ef78b024), [`b4f79db`](https://github.com/adobe/spectrum-design-data/commit/b4f79db78d8b889b46b98d0fc26d424c1d4fe5fe), [`ecd5f38`](https://github.com/adobe/spectrum-design-data/commit/ecd5f38dd679730bf1f2b9b3980cd5032ac4a9f1), [`62e74d7`](https://github.com/adobe/spectrum-design-data/commit/62e74d7f4d59bcc3e63fbc5b7c594f65ef78b024), [`62e74d7`](https://github.com/adobe/spectrum-design-data/commit/62e74d7f4d59bcc3e63fbc5b7c594f65ef78b024), [`8d8bf09`](https://github.com/adobe/spectrum-design-data/commit/8d8bf0904e716ed86b10f890251980f73f0215c7), [`02cc09f`](https://github.com/adobe/spectrum-design-data/commit/02cc09fc2a40c8b93ff759dec5573d360815c707)]:
  - @adobe/spectrum-design-data@0.9.0

## 1.7.3

### Patch Changes

- Updated dependencies [[`c923bd2`](https://github.com/adobe/spectrum-design-data/commit/c923bd27bba0ee484ba251d9baf6a63c5cfc68d0), [`e38c4e1`](https://github.com/adobe/spectrum-design-data/commit/e38c4e19f97aa590991b0c1ac40c2e1b24620cde), [`f9585da`](https://github.com/adobe/spectrum-design-data/commit/f9585daf01d5dab651793ce6f1d816f320623204), [`09b3970`](https://github.com/adobe/spectrum-design-data/commit/09b39705547954ba44dabe41c70c5b76a6f8b43e), [`82bb4c4`](https://github.com/adobe/spectrum-design-data/commit/82bb4c46f67a0b4a1a74fb18514d53925f85a3ca), [`212ec82`](https://github.com/adobe/spectrum-design-data/commit/212ec825e25c5ce7ae7342072522423b3ce07483), [`11c4d5a`](https://github.com/adobe/spectrum-design-data/commit/11c4d5a937064ba24f69437c59ab5ad1bfbe5f8c), [`0297e7e`](https://github.com/adobe/spectrum-design-data/commit/0297e7ee77e102a3756302f83ab9236cd142ee58), [`5e7db36`](https://github.com/adobe/spectrum-design-data/commit/5e7db3605547e680f777fc345f0005d7e3637a7e), [`4218d6a`](https://github.com/adobe/spectrum-design-data/commit/4218d6a1694db70cb37f656cd0250e306e48912d), [`035a1f9`](https://github.com/adobe/spectrum-design-data/commit/035a1f95d909f8e443a5e51baee6e30d11eedde5)]:
  - @adobe/spectrum-design-data@0.8.0

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
