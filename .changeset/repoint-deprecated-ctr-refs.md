---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-spec": minor
---

Re-point component/token relationship (CTR) `$ref`s that pointed at deprecated tokens
(e.g. accordion spacing bindings still referencing tokens deprecated by SDS-15500) onto
their live `lifecycle.replacedBy` target, and add a rule that catches regressions.

- **packages/design-data/relationships/*.json**: 1,366 relationship-only `$ref`s
  re-pointed to their live replacement via `lifecycle.replacedBy`; 285 with no
  replacement pointer are left as-is and now surface as SPEC-058 warnings. Does not
  change `packages/tokens/src/` (`@adobe/spectrum-tokens`) — verified byte-identical.
- **migrate-to-relationships.mjs** and **seed-token-bindings.mjs**: resolve through
  `lifecycle.replacedBy` when emitting a `$ref`, so re-running either generator can't
  reintroduce a deprecated reference.
- **sdk/core/src/validate/rules/spec058.rs**: new warning rule (`ctr-ref-not-deprecated`)
  flagging a relationship-only CTR whose `$ref` resolves to a deprecated token.
- **packages/design-data-spec/rules/rules.yaml**: catalogs SPEC-058.
