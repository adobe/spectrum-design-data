# @adobe/design-data

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
