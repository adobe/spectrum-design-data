---
"@adobe/design-data-spec": patch
---

Reconcile RFC coordination docs with shipped reality: Phase B, CTR, and guidelines
were undocumented or stale.

- **packages/design-data-spec/spec/authoring-workflow.md**: flip Phase B (foundation-corpus
  write path, token lifecycle ops, mode-set management) from "not yet shipped" to shipped;
  clarify `write_component` remains unscheduled.
- **packages/design-data-spec/spec/agent-surface.md**: promote `write_token` from RECOMMENDED
  to NORMATIVE (MUST), matching the Phase B promotion now reflected in authoring-workflow.md.
- **docs/rfc-coordination.md**: add RFC-E (Component/Token Relationships) and RFC-F
  (Guidelines/Phase 10) rows, a #1324 draft-RFC row, reference 6 previously-orphaned
  spec files, and refresh #806/#623/#625/#832 with rules and PRs shipped since the
  last update.
- **docs/token-studio-sunset.md**: mark Phase 1 (foundation-corpus write target) done,
  unblocking Phase 2.
