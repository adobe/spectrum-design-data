---
"@adobe/design-system-registry": patch
---

Add `disclosure-triangle`, `picker`, `progress-bar` to anatomy-terms.json.

Closes the spec/registry divergence surfaced during SPEC-035 implementation
(#924) — these three names appear in the canonical vocabulary table in
spec/anatomy-format.md but were missing from the registry, causing SPEC-035
to advisory-warn on them. Resolves #925.
