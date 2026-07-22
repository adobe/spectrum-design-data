# @adobe/design-data

## 3.0.3

### Patch Changes

- Updated dependencies [[`7652ef9`](https://github.com/adobe/spectrum-design-data/commit/7652ef92131342c3c2b8c3c1f3371f31ddc62fa8)]:
  - @adobe/design-data-wasm@0.4.4

## 3.0.2

### Patch Changes

- Updated dependencies [[`6acda22`](https://github.com/adobe/spectrum-design-data/commit/6acda2204f29884a09760076357ddd89954889f5)]:
  - @adobe/design-data-wasm@0.4.3

## 3.0.1

### Patch Changes

- [#1271](https://github.com/adobe/spectrum-design-data/pull/1271) [`df80f34`](https://github.com/adobe/spectrum-design-data/commit/df80f347baa0a9ae056804232228ae9fe3e55fae) Thanks [@GarthDB](https://github.com/GarthDB)! - Fixes a packaging bug where the `@adobe/design-data-wasm` npm tarball omitted
  the nested `pkg/node/package.json` and `pkg/web/package.json` files. Without
  them, Node's ESM/CJS module-type resolution incorrectly inherited
  `"type": "module"` from the wasm package root, causing every real consumer's
  `import("@adobe/design-data-wasm")` to crash with `ENOENT: no such file or
directory, open './design_data_wasm_bg.wasm'`. The previously published
  `0.4.0` is permanently broken and unusable — this releases a fixed version and
  republishes the two dependents against it.
  - **@adobe/design-data-wasm**: fix the `files` allowlist to include the
    per-target `package.json` manifests.
  - **@adobe/design-data-agent-mcp**: bump `@adobe/design-data-wasm` dependency
    to the fixed version.
  - **@adobe/design-data**: bump `@adobe/design-data-wasm` dependency to the
    fixed version.

- Updated dependencies [[`df80f34`](https://github.com/adobe/spectrum-design-data/commit/df80f347baa0a9ae056804232228ae9fe3e55fae)]:
  - @adobe/design-data-wasm@0.4.2

## 3.0.0

### Major Changes

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

### Minor Changes

- [#1212](https://github.com/adobe/spectrum-design-data/pull/1212) [`73e5bbf`](https://github.com/adobe/spectrum-design-data/commit/73e5bbfcb90bf9b0672bf6d32e2aee1cad9deca4) Thanks [@GarthDB](https://github.com/GarthDB)! - Register four atomic property terms in property-terms.json.
  - **packages/design-data/registry/property-terms.json**: add `minimum-width`,
    `minimum-height`, `maximum-width`, `thickness` — atomic CSS/design-system abstractions
    present in 103 layout-component tokens; apply.js registry guards now accept them.

- [#1210](https://github.com/adobe/spectrum-design-data/pull/1210) [`bb9421a`](https://github.com/adobe/spectrum-design-data/commit/bb9421a0d96067c2cd3a335d982a94b845c98570) Thanks [@GarthDB](https://github.com/GarthDB)! - Decompose variant, alignment, anatomy, and object from property into structured fields.
  - **packages/design-data/tokens/color-aliases.tokens.json**: extract `variant` (46 tokens:
    accent, negative, primary, etc.) and `object` (3 tokens) from property slugs.
  - **packages/design-data/tokens/typography.tokens.json**: extract `alignment` from baked
    property slugs (3 tokens: text-align-center/end/start).
  - **packages/design-data/tokens/layout-component.tokens.json**: extract `anatomy` (45 tokens:
    counter, description, label, etc.) and `object` (1 token) from property slugs.
  - **packages/design-data/tokens/color-component.tokens.json**: extract `anatomy` from
    baked property slugs (5 tokens).

## 2.0.3

### Patch Changes

- Updated dependencies [[`cece05d`](https://github.com/adobe/spectrum-design-data/commit/cece05de03dd8b43cfeb697d045eb4302a34b26c)]:
  - @adobe/design-data-wasm@0.4.0

## 2.0.2

### Patch Changes

- [#1143](https://github.com/adobe/spectrum-design-data/pull/1143) [`f829426`](https://github.com/adobe/spectrum-design-data/commit/f8294264fdcc5905a8d33dbdde391d8d452597b6) Thanks [@GarthDB](https://github.com/GarthDB)! - perf(validate): single-pass token read in validateDataset.
  - **tools/design-data/src/validate.js**: accumulate parsed tokens during the Layer-1
    JSON-Schema loop and reuse them for the Layer-2 wasm Dataset — eliminates the
    second `walkTokenFiles` + `readFileSync` pass that `loadDataset` previously triggered.
  - **tools/design-data/src/load.js**: export new `buildDataset(tokens)` helper
    (`Dataset.fromTokens` wrapper) for callers that have already parsed token data.

- Updated dependencies [[`f829426`](https://github.com/adobe/spectrum-design-data/commit/f8294264fdcc5905a8d33dbdde391d8d452597b6)]:
  - @adobe/design-data-wasm@0.3.0

## 2.0.1

### Patch Changes

- [#1141](https://github.com/adobe/spectrum-design-data/pull/1141) [`87f07af`](https://github.com/adobe/spectrum-design-data/commit/87f07af51cfdaa80788e943cd948232d78e6cfd7) Thanks [@GarthDB](https://github.com/GarthDB)! - perf(validate): single-pass token read in validateDataset.
  - **tools/design-data/src/validate.js**: accumulate parsed tokens during the Layer-1
    JSON-Schema loop and reuse them for the Layer-2 wasm Dataset — eliminates the
    second `walkTokenFiles` + `readFileSync` pass that `loadDataset` previously triggered.
  - **tools/design-data/src/load.js**: export new `buildDataset(tokens)` helper
    (`Dataset.fromTokens` wrapper) for callers that have already parsed token data.

- Updated dependencies [[`87f07af`](https://github.com/adobe/spectrum-design-data/commit/87f07af51cfdaa80788e943cd948232d78e6cfd7)]:
  - @adobe/design-data-wasm@0.2.0

## 2.0.0

### Major Changes

- [#1138](https://github.com/adobe/spectrum-design-data/pull/1138) [`a393c71`](https://github.com/adobe/spectrum-design-data/commit/a393c7132af49b92852e88b2632451f61a1e67bb) Thanks [@GarthDB](https://github.com/GarthDB)! - Rename `@adobe/design-data-js` → `@adobe/design-data`; remove binary npm packages.
  - **@adobe/design-data** (was `@adobe/design-data-js`): package renamed; all
    import paths (`@adobe/design-data/load`, `/write`, `/session`, `/validate`) are
    unchanged. Update your `package.json` dependency name to `@adobe/design-data`.
  - **sdk/npm/\***: platform binary packages (`darwin-arm64`, `darwin-x64`,
    `linux-x64`, `win32-x64`) and the CLI npm wrapper removed; use the Rust CLI
    binary directly or the wasm package instead.
  - **tools/design-data-agent-mcp**: dependency name updated to `@adobe/design-data`.

### Patch Changes

- Updated dependencies [[`a393c71`](https://github.com/adobe/spectrum-design-data/commit/a393c7132af49b92852e88b2632451f61a1e67bb), [`a393c71`](https://github.com/adobe/spectrum-design-data/commit/a393c7132af49b92852e88b2632451f61a1e67bb)]:
  - @adobe/design-data-wasm@0.1.0

## 1.0.0

### Major Changes

`@adobe/design-data` is now a **JS/wasm library** — the npm CLI launcher (`bin/design-data.js`
and the four `@adobe/design-data-{platform}` binary packages) has been removed.

- **`@adobe/design-data` v1.0.0**: replaces the CLI launcher with the Node.js glue library
  (previously `@adobe/design-data-js`). Exposes `loadDataset`, `validateDataset`, session
  helpers, and write utilities via `@adobe/design-data-wasm`.
- **`npx design-data` no longer works**: install the native CLI via
  `cargo install design-data-cli` or download from GitHub Releases.
- **Subpath exports** (`.`, `./load`, `./write`, `./session`, `./validate`) are unchanged from
  the internal `@adobe/design-data-js` package used in prior releases.
