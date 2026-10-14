---
"@adobe/token-names": patch
---

Resolve token-names sidecar slugs across all `tokens/src` files.

- **packages/token-names/test/coverage.test.js**: typography tokens moved to body, code,
  detail and heading files, so the one-to-one file check failed.
