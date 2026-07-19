---
"@adobe/spectrum-design-data": patch
---

Fix SPEC-020/SPEC-022 component anatomy/state gaps surfaced by strict
`--components-path` validation (7a5).

- **packages/design-data/components/tree-view.json**: declare the `default` state,
  used by the `space-between` token but previously undeclared.
- **packages/design-data/components/swatch.json**: declare the `slash` anatomy part,
  used by 4 `thickness` tokens but previously undeclared.
- **packages/design-data/components/stack-item.json**: new component file — 32 tokens
  reference `component: "stack-item"` but no schema existed; declares its
  `down`/`hover`/`key-focus` states.
