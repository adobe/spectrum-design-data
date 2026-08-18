---
"s2-tokens-viewer": patch
---

Restore search/resolution for component tokens broken by the CTR migration (#1330).

- **scripts/resolve.mjs**: add `buildLayoutComponentFile()` (mirrors `buildColorComponentFile()`)
  so non-color component tokens land in `tokens/layout-component.json` again — they're rendered
  and searchable, not just the color subset #1335 already fixed.
- **scripts/resolve.mjs**: build the wasm `Dataset` from the viewer's own cascade-converted
  source via `Dataset.fromTokens()` instead of the stale `Dataset.embedded()` snapshot, so
  component-token aliases resolve to real values instead of showing raw `{ref}` strings.
- **moon.yml**: add a `convert` task (`design-data-cli migrate convert`) that produces the
  cascade files `resolve` now consumes.
