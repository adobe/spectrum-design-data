---
"@adobe/design-system-registry": minor
"@adobe/design-data-spec": minor
---

feat(spec): property field migration path + property-terms registry (#941)

Adds normative migration policy for the `name.property` field per RFC #806 / issue #941:

- New `### Name-object migration policy` section in `spec/token-format.md` — documents SPEC-017 severity escalation to `error` at spec `2.0.0`, narrowed `property` semantics (CSS/styling attribute only), and step-by-step author migration guidance.
- New `packages/design-system-registry/registry/property-terms.json` registry — 35 seeded CSS/styling attribute terms (`color`, `background-color`, `border-radius`, `font-size`, `gap`, etc.).
- Updated `packages/design-data-spec/fields/property.json` — sets `registry` path to `property-terms.json`; exports `propertyTerms` from registry index.
- Updated `spec/taxonomy.md` Property row to call out anatomy/surface migration debt and link to the new migration section.
- Closed RFC #806 open question in `docs/rfc-coordination.md`.
