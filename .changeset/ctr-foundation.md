---
"@adobe/design-data-spec": minor
---

Add Component/Token Relationship (CTR) foundation — an anonymous-token
join entity unifying `tokenBindings` and name-object component scoping.

- **schemas/relationship.schema.json**: new Layer-1 schema for
  `relationships/*.json`, mirroring `token.schema.json`'s value/`$ref` split.
- **spec/relationship-format.md**: normative prose for the CTR scope
  model and interim legacy-compatibility fields.
- **rules/rules.yaml**: SPEC-051..057, headlined by `ctr-option-valid`
  validating a CTR's options against the component's own options schema.
