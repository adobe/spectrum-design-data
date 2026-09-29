---
"@adobe/spectrum-design-data": patch
---

Fix legacy-output regressions surfaced by the size token taxonomy refinements.

- **relationships/field.json**: Removed the deprecated `field-width-*` aliases that
	duplicated the `legacyKey` now owned by the new `layout-component` size tokens
	(per author confirmation, those legacy names are reused intentionally).
- **tokens/layout-component.tokens.json, tokens/layout.tokens.json**: Moved 82
	non-component-scoped tokens (`banner-*`, `base-height-*`, `container-*`, `size-*`,
	`thickness-size-*`) out of `layout-component` into `layout`, where shared tokens live.
- **relationships, tokens**: Added the missing `lifecycle` deprecation to 149 scale-set
	sibling entries (mobile variants) that were left inconsistent with their deprecated
	desktop counterpart.
