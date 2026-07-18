---
"@adobe/spectrum-design-data": patch
---

Add icon-domain recognition to decompose/serialize and migrate icon `size-N` tokens
to `scaleIndex` (5p3, dsi.6 follow-up).

- **tools/token-mapping-analyzer/src/registry-index.js**: index each term's `tokenName`
  (e.g. "checkmark" → "checkmark-icon") as its own matchable segment set, not just a
  serialization alias, so decompose can recognize the icon's expanded legacy form.
- **tools/token-mapping-analyzer/src/decomposer.js**: `serialize()` gained an icon-owner
  branch (mirrors `naming.rs`'s icon-first legacy key ordering); `decompose()` now accepts
  metadata-provided `icon` (mirrors existing `component` handling) to disambiguate
  tokenName/anatomy-term collisions of equal segment length (e.g. `link-out-icon`); added
  `"icon"` to the stale `FALLBACK_SERIALIZATION_ORDER`.
- **tools/token-mapping-analyzer/src/apply.js**, **index.js**: thread `token.name.icon`
  metadata into `decompose()` calls.
- **packages/design-data/tokens/layout-component.tokens.json**: 112 icon `size-N` tokens
  migrated from fused `property: "size-N"` to `property: "size"` + numeric `scaleIndex`,
  following the dsi.6 recipe; legacy-verify confirms byte-identical output.
- **packages/design-data/tokens/layout.tokens.json**: 1 additional `space-between` token
  picked up by the same full-cascade run.
