---
"@adobe/design-data-spec": minor
"@adobe/design-data-wasm": minor
---

feat(sdk): changelog attributes tokens a component reaches through tokenBindings (hzje.31)

- **design-data changelog**: a token change reaches a component that names the token in
  `tokenBindings` (resolved by token name to every token uuid with that name), not only through
  relationships. Such entries carry `reachedBy: "tokenBinding"`; a token reached both ways is
  attributed once, unmarked.
- **component-changelog.schema.json**: entries gain an optional `reachedBy`.
