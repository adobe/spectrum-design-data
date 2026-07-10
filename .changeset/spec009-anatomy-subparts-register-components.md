---
"@adobe/spectrum-design-data": minor
---

Register 4 cross-cutting anatomy sub-parts as first-class components (part of
spectrum-design-data-46d), clearing the remaining 71 SPEC-009 warnings. No token data
changes — these values are reused across multiple unrelated components with no single
accurate parent, so each is registered directly rather than routed via `anatomy`.

- **packages/design-data/registry/components.json**: add `bar-panel` (6 tokens),
  `field` (8), `in-field-button` (25), `stack-item` (32).
