---
"s2-tokens-viewer": patch
---

Fix crash and duplicate work in resolve.mjs found in review of #1341.

- **scripts/resolve.mjs**: `loadCascadeTokens()` now throws a clear error naming
  `moon run viewer:convert` when `cascade/` is missing, instead of an uncaught `ENOENT`.
- **scripts/resolve.mjs**: merge `buildColorComponentFile()` and `buildLayoutComponentFile()`
  into a single `buildComponentFiles()` pass over `tokensDir` so each component token file is
  read, parsed, and checked for color-domain only once instead of twice.
