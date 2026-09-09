---
"@adobe/design-data-wasm": minor
"@adobe/design-data-tui": minor
---

Load platform-manifest extensions from the sibling `extensions/` directory
(glob-discovered, per-fragment schema-validated, merged at load time) instead of an
inline `extensions` object, matching the Layer 1 format change in design-data-spec@4.0.0
(closes spectrum-design-data-h890.26.6).

- **sdk/core manifest loader (surfaced via wasm/tui)**: glob-discovers
  `extensions/{tokens,components,fields,guidelines,relationships,platform-extensions}/`,
  validates each fragment against its category schema, and merges them at load time
  (deep-merge for `tokens/`, sorted-path-order/last-wins otherwise); manifests using the
  old inline `extensions` object are now rejected (#1422, #1423).
