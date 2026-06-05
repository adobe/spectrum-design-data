---
"@adobe/design-data-wasm": patch
---

Fix CI failure by marking `cache-build` task as `local: true`.

- **sdk/wasm/moon.yml**: add `local: true` to `cache-build` so moon CI skips it;
  the task is manual-only (embedded feature is disabled by default).
