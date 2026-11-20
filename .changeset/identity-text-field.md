---
"@adobe/design-data-wasm": patch
"@adobe/spectrum-design-data": patch
---

Migrate text-field to structured identity (level 2) and add the fused-property codemod
(5m92.6, 5m92.22).

- text-field: 46 live records lose their fused `scope.property` (`component-height-75`,
  `component-edge-to-text-100`, `to-component`) for a real term plus a size pin, a `between`
  or a modifier pin. Every uuid is kept except two duplicate records (see the PR).
- Edge gaps use `space-between` with axis endpoints (`start-edge`, `end-edge`, `top-edge`,
  `bottom-edge`). A token that serves both edges is two records with the same `$ref`.
- Registry: `top-edge` added to positions; `registry_data.rs` regenerated.
- `scripts/decompose-fused-properties.mjs` (`--report`, `--write`, `--check`, `--family`) with
  tests. It refuses name modifiers the component lacks, skips legacyKey records, reports
  judgement cases and never touches `background-color` or `border-color` records.
- Ratchet: live `background-color` and `border-color` records are held at 36.

Legacy `@adobe/spectrum-tokens` output is byte-identical.
