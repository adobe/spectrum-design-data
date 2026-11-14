---
"@adobe/spectrum-design-data": patch
---

Declare the `selected` state of `select-box`, `stack-item` and `tree-view` with
`trigger: "prop"`, as the state model and RFC-A require for a state driven by
`isSelected`. It was `interaction`. The compound `selected-*` states keep their
`interaction` trigger.
