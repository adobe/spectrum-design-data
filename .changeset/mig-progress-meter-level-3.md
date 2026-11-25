---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Migrate progress-bar and meter relationship records and recipes to structured identity. Both
components move from status level 1 to level 3. The legacy `@adobe/spectrum-tokens` output and the
rendered SVGs are unchanged.

- All 97 live records get a `scope.part` (container, header, label, track, fill) from the
  components' anatomy. The fused names decompose: `font-size-75..300` becomes `font-size` with a
  `size` pin, `line-height-100` becomes `line-height`, `component-top-to-text-75..300` becomes
  `space-between` between `top-edge` and `text` with a `size` pin.
- The recipes bind by part and identity instead of by `context`. Their context selectors go to 0.
- The `maximum-width` record pinned by `legacyKey` gets the same `context` as its alias record, which
  clears the last identity collision in each component. No uuid, `legacyKey`, `$ref` or
  `contextRole` change; deprecated records are untouched.
- The progress-bar and meter spec sheets drop one duplicate inline `maximum-width` row each and
  regroup the size-dependent rows; the other 90 sheets are unchanged.
