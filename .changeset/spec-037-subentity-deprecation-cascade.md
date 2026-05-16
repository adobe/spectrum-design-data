---
"@adobe/design-data-spec": minor
---

Add SPEC-037 (`sub-entity-deprecation-cascade`) advisory rule: warn when a non-deprecated
token references a deprecated anatomy part, deprecated component state, or deprecated
option-enum value via its `name` object. Schemas extended to allow `lifecycle` on anatomy
parts and states, and `deprecatedEnumValues` on option descriptors.
