---
"@adobe/spectrum-design-data": minor
"@adobe/spectrum-tokens": minor
---

Re-key icon tokens off the new `icon` name field (part of spectrum-design-data-aui),
clearing ~315 SPEC-009 warnings. Published legacy keys are unchanged.

- **packages/design-data/registry/icon-terms.json**: new registry, 12 icon ids (`icon`,
  `ui`, `checkmark`, `chevron`, `dash`, `arrow`, `cross`, `add`, `link-out`,
  `drag-handle`, `asterisk`, `gripper`), with `tokenName` long-form expansions.
- **packages/design-data/tokens/icons.tokens.json**: 191 tokens re-keyed
  `component:'icon'` → `icon:'icon'`.
- **packages/design-data/tokens/layout-component.tokens.json**: 124 tokens re-keyed
  `component:'X-icon'` → `icon:'X'` across 11 distinct values.
- **sdk/core/src/naming.rs**: `extract_legacy_key` gains an icon (non-color) branch and
  a thin-format guard so re-keyed tokens still resolve to their original legacy key.
- **sdk/core/src/legacy.rs**: legacy-metadata hoisting (`resolve_owner_component`) now
  falls back to the icon field so published `component` metadata is unaffected.
- **packages/tokens/src/icons.json**, **layout-component.json**: regenerated, byte-identical
  to their pre-change state.
