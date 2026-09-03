---
"@adobe/spectrum-design-data": minor
---

`figma diff`/`figma import` now resolve CTR `$ref`s that target another CTR's
own `uuid`/`setUuid` instead of a token, recovering 3 `drop-zone-*-font-size`
`.Platform scale` variables previously reported `figma-only`
(closes spectrum-design-data-11k.10.9).

- **sdk/core/src/graph.rs**: `resolve_relationship_ref` recurses into a
  sibling CTR when its `$ref` target isn't a token, following chains up to
  16 hops deep (e.g. `drop-zone-title-font-size` → `illustrated-message-*` →
  `body-*` → a token). `relationship_target_exists` now shares the same
  sibling lookup. `code-cjk-font-family` still doesn't resolve — its chain
  bottoms out at an inline `font-family` CTR, out of scope by design.
