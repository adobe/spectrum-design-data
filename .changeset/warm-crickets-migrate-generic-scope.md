---
"@adobe/spectrum-design-data": minor
---

Resolve the generic-scope taxonomy call from issue #1290 (bead
`spectrum-design-data-88m`): decompose `container-*`/`text-*`/`workflow-icon-*`
layout tokens into structured name objects, each pinned with a `legacyKey` so
the fused legacy key is unchanged.

- **packages/design-data/registry/anatomy-terms.json**: flag `text` and
  `workflow-icon` as `standaloneScope: true` so SPEC-025 accepts them as a
  bare `anatomy` value with no owning component/structure.
- **packages/design-data/tokens/layout.tokens.json**: re-author 37 active
  tokens — 15 `container-*` to `structure: "container"`, 6 `text-*` to
  `anatomy: "text"`, 16 `workflow-icon-*` to `anatomy: "workflow-icon"` —
  each with an explicit `property`/`size` and pinned `legacyKey`.
  `component-*` tokens are left unchanged (intentionally scopeless).
