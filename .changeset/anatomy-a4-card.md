---
"@adobe/design-data-wasm": patch
"@adobe/spectrum-design-data": minor
---

Review the anatomy of card and merge `cards` into it (A4, first pass).

- Removed the `cards` component. Its 112 live relationship records, docs blocks and
  accessibility moved into `card` (10 records that only pointed at a `card` record were
  dropped). The Hub's `cards` page now maps to `card`.
- card anatomy: `container` (root), `preview`, `selection` (the checkbox plate), `title`,
  `description` and `focus-indicator`. Every live record carries a part; inner gaps are
  `between` on `container`. The selected stroke is a `container` state.
- card options: `variant` (primary, secondary, tertiary, quiet), `size` and `density`. The old
  card-kind `variant` (asset, collection, flex, ...) is gone. States: hover, down,
  keyboard-focus, selected, disabled, loading.
- Size, density and variant are pinned on records instead of prose contexts. The 15 padding
  records use `property: padding`.
- card-horizontal, collection-card and user-card are archive-only: no live records, component
  `lifecycle.deprecatedIn`, archived records untouched.

Legacy `@adobe/spectrum-tokens` output is byte-identical.
