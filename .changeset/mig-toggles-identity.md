---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Migrate checkbox, switch and radio-button relationship records and recipes toward structured
identity. The legacy `@adobe/spectrum-tokens` output and every rendered SVG are unchanged.

- Checkbox, switch and radio-button move from status level 1 to level 3. The two switch
  `line-height-100` records get `contextRole` `["label"]` and `context` `Label` (the `size` role was
  an authoring slip). The 7 radio-button `background-color` records gain `scope.part` `control`;
  the other 29 `background-color` and `border-color` records are left as they are.
- Fused names decompose: `component-height-*` becomes `minimum-height`, `font-size-*` and
  `line-height-font-size-*` become `font-size` and `line-height`, and
  `component-top|bottom-to-text-*` becomes `space-between` between `top-edge` or `bottom-edge` and
  `label`, each with a `size` pin.
- Radio-button records get a `scope.part` and `between` from the anatomy. The recipes bind by
  property, part and `between` instead of `context` (radio-button context selectors 24 to 0).
- 25 `legacyKey` records get the `context` of their alias record, which clears the identity
  collisions. No uuid, `legacyKey` or `$ref` change; deprecated records are untouched.
- The switch, checkbox and radio-button spec sheets lose four duplicate bottom-edge rows each, and
  the legacy-pinned switch rows split by scale.
