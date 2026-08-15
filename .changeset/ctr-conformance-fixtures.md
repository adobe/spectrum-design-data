---
"@adobe/design-data-spec": patch
---

Add conformance fixtures for the Component/Token Relationship (CTR) rules
(closes spectrum-design-data-x29.5).

- **conformance/invalid/SPEC-051..057**: one dataset + expected-errors
  fixture per CTR rule (undeclared component/part/option/state, unresolved
  `$ref`, duplicate `uuid`, missing `legacyKey` warning).
- **conformance/valid/SPEC-051**: a zero-diagnostic baseline CTR dataset
  covering both value-owning and relationship-only shapes.
- **conformance/generation/ctr-legacy-key**: proves a value-owning CTR
  reproduces its legacy token byte-identically and a relationship-only
  CTR is filtered out of legacy output.
- **scripts/check-layout.mjs**: registers the new fixture paths.
