---
"@adobe/design-data-spec": minor
---

Add any-of to relationship scopes (proposal 017). `scope.options.anyOf` is an array of option
conditions: the record applies when its other pins match and at least one alternative matches, so
"selected or indeterminate" is one record. An element of `scope.options.state` may be
`{ "anyOf": [state, ...] }`. A record with an any-of is equivalent to one record per alternative
with the same `$ref`. `anyOf` is reserved as an option name, an any-of cannot be used on a record
that carries its own `value` or a `legacyKey`, and SPEC-053 and SPEC-054 check each alternative
and member. `relationship.schema.json` accepts both forms.
`relationship.schema.json` also allows numeric option pins (for example `scaleIndex`), which the
data already uses.
