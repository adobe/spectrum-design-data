---
"@adobe/design-data-spec": patch
---

SPEC-118 lints inline collection item semantics; a Range vector pins the snap-back tolerance.

- **sdk/core spec118.rs**: warns when an inline collection item names an unknown anatomy
  part in `parts` or `semantics`, exposes a facet the item does not declare, maps a value
  the facet lacks, or copies an option the item `state` omits. No new rule id, and no
  existing contract warns.
- **conformance/invalid/SPEC-118**: gains an inline item with an unknown part and facet.
- **conformance/behavior/number-field.json**: a vector pins that decrement from an empty
  value with max 0.3 and step 0.1 gives 0.3, not 0.2 (the 1e-9 snap-back tolerance).
- **sdk/core/tests/fixtures/behavior-range.json**: the same vector for ArrowDown and
  for the decrement intent.
