---
"@adobe/spectrum-component-diff-generator": patch
---

Fixed local component schema loading always returning zero components (closes #1304).

- **src/lib/component-file-import.js**: `loadLocalComponents` called
  `this.localFS.loadData([filePath])` with the wrong argument shape, so `fileNames` was
  `undefined` inside `loadData` and every local file load silently failed and was skipped.
  Any comparison using `--local` (e.g. remote-base-branch vs. local-checkout, used by CI
  for fork pull requests) reported every remote component as deleted.
