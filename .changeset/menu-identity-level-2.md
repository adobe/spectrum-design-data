---
"@adobe/spectrum-design-data": patch
---

Migrate menu relationship records to structured identity (level 2). Fused names
(`component-height-75`, `component-edge-to-text-100`, `font-size-100`) become real properties
with a part, a `between` and a size pin. The legacy `@adobe/spectrum-tokens` output is
byte-identical.

- Every live record has a part or a `between`; deprecated records and all uuids are untouched.
- Start/end edge-to-content records split into a start-edge and an end-edge record (new v5 uuids).
