# @adobe/design-data

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
