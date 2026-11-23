---
"@adobe/design-data-spec": minor
"@adobe/design-data-wasm": patch
---

Let a nested component part float by `side`.

- SPEC-112 accepts a `component` part with `floating.side` (a slider's
  field label above its track), as it already did for `position`.
- A nested floating component that is zero wide (a field label with no
  text) is kept and draws nothing, with no diagnostic.
- Unit tests cover both; no recipe or data changes.
