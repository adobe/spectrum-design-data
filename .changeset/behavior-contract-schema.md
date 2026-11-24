---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": minor
---

Add the behavior contract format (proposal 022), expand step only. No
component has a contract yet and renders are unchanged.

- Spec: `spec/behavior-contract.md` and `schemas/behavior.schema.json` for
  `behaviors/<component>.json` (state options, facets, intents, parts, guarded
  transitions, `wcag`, conformance vectors).
- Registries `facets.json`, `intents.json` (today's `intents` and
  `keyboardIntents` vocabulary, nothing else) and `capabilities.json`, embedded
  in the SDK.
- Rules SPEC-118 to SPEC-120 (warnings) check that a contract's options,
  facets, parts, intents, capabilities and vectors resolve. `behaviors/` is read
  as a sibling of `visuals/`; a dataset without it is unaffected.
- `design-data:validate-behaviors` checks contracts against the schema.
- The `accessibility` block stays; the contract is planned to replace it.
