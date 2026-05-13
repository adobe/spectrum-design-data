---
"@adobe/design-data-spec": minor
---

Phase 6.7: token binding declarations

- Add optional `tokenBindings` array to component declarations (`component.schema.json`): lists
  tokens a component uses, including foundation/structure tokens not scoped to the component in
  their name-object. Each entry has a required `token` (name string) and optional `context` (Figma
  Group label).
- Add optional `componentBindings` array to token declarations (`token.schema.json`): reverse index
  of `tokenBindings`; informative and derivable from component files.
- Add SPEC-027 (`token-binding-token-exists`): each `tokenBindings[].token` MUST match a declared
  token name in the dataset.
- Add conformance fixtures for SPEC-027 (`conformance/invalid/SPEC-027/`,
  `conformance/valid/token-bindings.json`).
- Extend `spec/component-format.md` with Token bindings section and updated SPEC rules table.
- Add `componentBindings` section to `spec/token-format.md`.
- Update `describe_component` return shape in `spec/agent-surface.md` to include `tokenBindings`.
- Seed `tokenBindings` on 58 component files from spec-snoop Figma extraction data.
