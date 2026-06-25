---
"@adobe/design-data-spec": minor
---

feat(authoring): B7 — generation conformance fixtures and determinism gate
(closes #122.7).

- **packages/design-data-spec/conformance/generation/**: Four new lifecycle
  fixtures — `deprecated-token` (string→bool normalization + `plannedRemoval`
  drop), `renamed-token` (UUID→name `renamed` resolution), `alias-rewire`
  (`$ref`→`{name}` denormalization), `mode-set-edit` (lifecycle field hoisting
  to outer set level).
- **sdk/core/src/lib.rs**: `generation_conformance` test module drives all six
  fixtures with byte-identical comparison and a determinism re-run gate.
