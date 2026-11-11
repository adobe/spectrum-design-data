---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": minor
---

Add a relationship-context vocabulary and optional structured context fields.

- New registry `registry/relationship-contexts.json`: 23 main words with aliases
  for today's head words.
- `relationship.schema.json` gains optional `contextRole` (registry term ids),
  `contextPart` and `contextQualifier`. The `context` string stays the identity
  key that recipes bind on.
- `relationship-format.md` states that a recipe binds on `context`, the string
  grammar, and when a live record may omit it.
- New warning rules: SPEC-090 (fields agree with the string), SPEC-091 (main
  word is registered) and SPEC-092 (live record with no context that no
  contexted record reaches). SPEC-091 and SPEC-092 are held at a baseline in
  `recipe-lint-baseline.json`.
