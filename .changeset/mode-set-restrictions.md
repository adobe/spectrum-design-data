---
"@adobe/design-data-spec": minor
---

feat(spec): add `modeSetRestrictions` to platform manifest and SPEC-041 coverage rule

Platforms can now declare which mode values are valid in a given mode set via the optional
`modeSetRestrictions` manifest field (e.g. iOS restricting `colorScheme` to `["light"]`).
The cascade resolver filters restricted candidates before context matching (step 0 of the
resolution algorithm). SPEC-041 (`mode-set-restriction-coverage`) enforces that every token
group has at least one candidate surviving all restrictions simultaneously, and reports
unknown mode set names and missing defaults as separate sub-diagnostics.
