---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": minor
---

Add the behavior exemptions registry (proposal 022), expand step. No render or
spec sheet changes.

- Registry: `exemption-reasons.json` (`static-text`, `static-display`,
  `container`, `sub-part`, `decorative`) and `behavior-exemptions.json`, which lists the 26
  components that take no interaction and so have no contract, each with a
  reason.
- New rule SPEC-123 (warning): a component with no `accessibility.role` needs a
  contract or an exemption, not both, and an exemption's reason must be
  registered. Components with neither are the migration backlog.
- Spec: new Exemptions section in the behavior contract page.
