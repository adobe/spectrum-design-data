---
"@adobe/design-data-wasm": patch
"@adobe/spectrum-design-data": patch
---

Migrate tag and combo-box to level 2 identity (5m92.6).

- tag: every live record gets a `part` (container, icon, label, clear-button, focus-indicator).
  Fused names become terms plus structure: `component-height-N` to `minimum-height`,
  `workflow-icon-size-N` to `size` on the icon, edge, top and gap spacing to `space-between`
  with `between` endpoints and a size pin, `font-size-N` to `font-size` + size pin,
  `line-height-100` to `line-height` on the label. The five identity collisions are gone.
- tag colour records get `attribute: background`; the disabled fill context is harmonised to
  Background. The seven `legacyKey` records take the identity and context of the record that
  aliases them. Every uuid is kept.
- combo-box: the stale `visual-to-field-button-quiet` record, a duplicate of the live
  alert-icon to field-button spacing record, is removed.
- Status baseline: tag and combo-box 1 to 2. `background-color`/`border-color` stay frozen at 36.

Legacy `@adobe/spectrum-tokens` output is byte-identical.
