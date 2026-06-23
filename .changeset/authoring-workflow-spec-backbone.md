---
"@adobe/design-data-spec": minor
---

Add normative authoring-workflow spec backbone (Phase A1, RFC #625).

- **packages/design-data-spec/spec/authoring-workflow.md**: New spec document defining the
  authoritative source contract, lifecycle operations (create / edit / deprecate / rename /
  alias-rewire / mode-set management), taxonomy-aware authoring requirement, output-generation
  obligations, and scheduled promotion of write ops from RECOMMENDED to MUST when Phase B
  foundation-corpus write tooling ships.
- **packages/design-data-spec/spec/index.md**: Register `authoring-workflow.md` in the Scope
  list (item 16) and Normative references table.
- **docs/rfc-coordination.md**: Update RFC #625 row — authoritative spec now linked; Phase 4
  status updated to reflect Phase A progress.
