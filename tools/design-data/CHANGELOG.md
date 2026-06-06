# @adobe/design-data

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
