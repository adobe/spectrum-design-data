---
"@adobe/design-data-spec": major
---

**Breaking:** Replace `optionDescriptor.enum` + `deprecatedEnumValues` with a
structured `values` array.

Each entry in `values` is an `optionValue` object (`{ value, description?, lifecycle? }`),
eliminating the key-drift hazard that existed when `deprecatedEnumValues` could reference
values absent from `enum`.

Migration: convert `"enum": ["a", "b"]` to
`"values": [{"value": "a"}, {"value": "b"}]`. Any `deprecatedEnumValues` entries fold into
the matching `values[].lifecycle` object.

SDK rules updated: SPEC-019 (`component-variant-valid`) reads `values[].value` instead of
`enum[]`; SPEC-037 (`sub-entity-deprecation-cascade`) reads `values[].lifecycle.deprecated`
for the option-value cascade.
