---
"@adobe/spectrum-design-data": patch
---

Migrate status-light, in-line-alert, alert-banner and toast to level 2 identity (5m92.6). coach-indicator is already level 2.

- Fused names become real terms: `font-size-N` to `font-size` (status-light keeps its four sizes as `size` pins), `line-height-100` to `line-height`, `workflow-icon-size-100` to `size` on the icon, `component-height-50` to `minimum-height`. Every uuid is kept.
- alert-banner's two close-button to end-edge gaps are told apart by a `scale` pin: 8px on desktop, 12px on mobile.
- toast's note-like "Toast token changes (Jan 2025)" colour record becomes the neutral container background, so every toast record has a part.
- The status-light, in-line-alert and alert-banner colour records already carry an attribute and a part; no `background-color`/`border-color` record is added.

Legacy `@adobe/spectrum-tokens` output is byte-identical.
