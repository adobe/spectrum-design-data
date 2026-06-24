---
"@adobe/spectrum-tokens": patch
---

Restore the `./src/*` subpath export for @adobe/spectrum-tokens.

- **packages/tokens/package.json**: re-add `./src/*` to `exports`; dropped when the
  strict allowlist landed in #740, only `./dist/*` was restored in #747, breaking
  `@adobe/spectrum-tokens/src/*.json` imports for raw-source-JSON consumers.
