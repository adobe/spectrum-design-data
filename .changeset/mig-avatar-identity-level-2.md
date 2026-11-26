---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Migrate avatar relationship records and recipe to structured identity. Avatar moves from status
level 1 to level 2. The legacy `@adobe/spectrum-tokens` output is unchanged.

- All 24 live records without a `scope.part` get one: `container` (size, border, opacity, focus
  indicator, gradient stops and fills), `initials` (font and text color), `guest-icon` (icon color).
- The three gradient stops become one identity each through the new `scope.ordinal` field:
  `gradient-stop-1..3` becomes `gradient-stop` with ordinal 1 to 3, and the three
  `Background (gradient stop N)` colors become `color` / `background` with the same ordinals. The
  recipe selects the stops by `{part, ordinal}` instead of by context.
- Fused names decompose: `font-size-100` becomes `font-size`, `line-height-100` becomes
  `line-height`; initials and icon `color` becomes `content-color`, as in other migrated components.
- Legacy names keep their `legacyKey` pins (`avatar-border-color`, `avatar-opacity-disabled`,
  `avatar-border-width`, `gradient-stop-N-avatar`).
- Renders are unchanged: 6,434 avatar, tag and related scenes render byte-identical SVG before
  and after, plus 600 PNGs. The avatar spec sheet merges the three gradient-stop token blocks into
  one block with three rows; every row still appears once.
