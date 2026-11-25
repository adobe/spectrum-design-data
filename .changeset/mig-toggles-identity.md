---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Migrate checkbox, switch and radio-button relationship records and recipes toward structured
identity. The legacy `@adobe/spectrum-tokens` output and every rendered SVG are unchanged.

- Checkbox moves from status level 1 to level 3. Switch and radio-button stay at level 1: switch
  keeps two `line-height-100` records (`contextRole` and `context` disagree) and radio-button keeps
  seven `background-color` records without a part. The 36 `background-color` and `border-color`
  records are left as they are for the token taxonomy split.
- Fused names decompose: `component-height-*` becomes `minimum-height`, `font-size-*` and
  `line-height-font-size-*` become `font-size` and `line-height`, and
  `component-top|bottom-to-text-*` becomes `space-between` between `top-edge` or `bottom-edge` and
  `label`, each with a `size` pin.
- Radio-button records get a `scope.part` and `between` from the anatomy. The recipes bind by
  property, part and `between` instead of `context`. Radio-button context selectors go from 24 to 1:
  the carved-out `background-color` records have no part, so that binding keeps its `context`.
- 25 `legacyKey` records get the `context` of their alias record, which clears the identity
  collisions. No uuid, `legacyKey` or `$ref` change; deprecated records are untouched.
- The switch, checkbox and radio-button spec sheets lose four duplicate bottom-edge rows each, and
  the legacy-pinned switch rows split by scale.
