---
"@adobe/design-data-spec": minor
---

Add SPEC-043 severity schedule to taxonomy.md and fix dangling xref (Phase A3, RFC #625).

- **packages/design-data-spec/spec/taxonomy.md**: add `### SPEC-043 severity schedule`
  subsection — documents current warning severity, the 2.0.0 graduation condition (no
  earlier than two minor versions after Phase B catalog-aware authoring ships), and the
  ≥ 90% per-domain compliance prerequisite; mirrors the SPEC-017 precedent.
- **packages/design-data-spec/spec/authoring-workflow.md**: fix dangling cross-reference
  at line 98 — `[Taxonomy](taxonomy.md)` now resolves to the new anchor
  `taxonomy.md#spec-043-severity-schedule`.
