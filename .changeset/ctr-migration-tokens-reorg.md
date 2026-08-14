---
"@adobe/spectrum-tokens": major
---

Reorganize `src/` into per-component token files, following the CTR
migration in `@adobe/spectrum-design-data` (spectrum-design-data-x29.4).
Token content is unchanged byte-for-byte per token; only the file each
token lives in changes. Breaking for any consumer importing a specific
`src/*` path directly (`exports["./src/*"]`) rather than through the
package's aggregated output.

- **packages/tokens/src/{color-palette,layout-component,layout,typography}.json**:
  name.component-scoped tokens removed.
- **packages/tokens/src/\*.json**: 84 new per-component files (e.g.
  `body.json`, `popover.json`, `button.json`) holding the tokens moved
  out of the files above.
