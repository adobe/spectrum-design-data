---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-spec": patch
"@adobe/design-data-wasm": patch
---

Stop the component changelog from reading re-scoped records as removals.

- Relationship records that match on component, property, context and target pair
  as an update when `scope.options` differ.
- A context rename on the same target is a documentation update. Trailing
  whitespace in a context is not a change.
- Removing a relationship whose exact twin survives is metadata, not major.
- Changelogs are regenerated: button and accordion leave 2.0.0 (1.2.0), combo-box
  and text-area leave 2.0.0 (1.1.2).
