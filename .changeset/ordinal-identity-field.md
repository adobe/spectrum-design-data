---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Relationships can carry an ordinal in their identity.

- **relationship-format.md, relationship.schema.json**: new `scope.ordinal` (integer, 1 or
  more). Records that differ only by it are distinct identities, so the stops of one gradient
  need no digit in the property name. A record without it is unchanged.
- **Rule SPEC-125** (`relationship-ordinal-valid`, error): the ordinal is a positive integer.
- **component-visual.schema.json**: a structured selector may name `ordinal`.
- **Engine**: the identity line, the status collision check, the changelog identity class
  (an ordinal change is an API change) and the record diff label read the ordinal.
- No data uses the field yet; the avatar gradient stops migrate in a follow-up.
