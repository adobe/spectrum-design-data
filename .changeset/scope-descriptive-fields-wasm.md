---
"@adobe/design-data-wasm": minor
---

Accept `between`, `object`, `position`, `structure`, `qualifier` and `icon` in a relationship
`scope` (they were refused since the scope gate), and report SPEC-101 for values outside their
registry vocabulary. A value of the wrong shape is still refused. The committed data uses none, so
nothing changes today.
