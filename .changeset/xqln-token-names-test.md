---
"@adobe/token-names": patch
---

Split the typography name sidecar to match the per-component token files.

- **packages/token-names/names/**: move six entries out of `typography.json` into new
  `body.json`, `code.json`, `detail.json` and `heading.json`, mirroring `tokens/src`.
