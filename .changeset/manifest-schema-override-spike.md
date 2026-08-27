---
"@adobe/design-data-spec": patch
---

Record the h890.23.5 decision on whether a platform manifest may override
Layer-1 schemas.

- **packages/design-data-spec/spec/manifest-schema-override-spike.md**: new
  decision doc — no-go, with rationale (circularity, broken conformance
  guarantees, no concrete need).
- **packages/design-data-spec/spec/manifest.md**: capability matrix gains an
  explicit "Override Layer-1 schemas" row linking to the decision.
