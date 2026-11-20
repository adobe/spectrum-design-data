---
"@adobe/design-data-wasm": patch
"@adobe/spectrum-design-data": minor
---

Finish the fields anatomy review (A2-2).

- in-field-button is reviewed as a component with its own anatomy, `container` and `icon`
  (`fill` is renamed `container`, and its stacked rounding record follows). Hosts already nest
  it as the part `in-field-button`. The stacked S1 width records stay active, with no part.
- Removed the `in-field-progress-button` component: it had no relationship records, no anatomy
  and no design source (Figma only has the in-field progress circle). Its docs, schema mirror
  and changelog go with it.
- date-field gets the root `container` / `field` anatomy and is reviewed (level 2).
- text-field, text-area and combo-box no longer restate field-label's `top-to-asterisk`
  records (6 records, same tokens as field-label's own).

Legacy `@adobe/spectrum-tokens` output is byte-identical. Deprecated records are untouched.
