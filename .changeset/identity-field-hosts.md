---
"@adobe/design-data-wasm": patch
"@adobe/spectrum-design-data": patch
---

Migrate the field hosts to structured identity (5m92.6, 5m92.22); extend the codemod.

- text-area, search-field, number-field, in-field-button and tag-field reach status level 2.
  tag-field's 15 "Background and border" colour records stay unsplit (see the PR).
  combo-box and picker stay at level 1 on records that need a design call.
- Fused `scope.property` names (`component-height-75`, `component-edge-to-text-100`,
  `to-component`, `workflow-icon-size-100`) become real terms plus a size pin, a `between`
  or a modifier pin. Every uuid is kept except four identical duplicates; new split
  uuids follow `backfill-relationship-uuid.mjs`.
- Edge gaps use `space-between` with axis endpoints; a token that serves both edges is
  two records with the same `$ref`. Disabled colour records move to an `isDisabled` pin.
- in-field-button: the four stacked width records get `part: container`.
- Codemod: colour split rule (background and border into two records), `options.size`
  from the token's size word when records would otherwise tie, size words (`-small`,
  `-extra-large`), the edge axis from the token's padding property, and the CJK
  `name.legacyKey` check.

Legacy `@adobe/spectrum-tokens` output is byte-identical.
