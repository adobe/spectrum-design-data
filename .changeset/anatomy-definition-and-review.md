---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Define what an anatomy part is and review the first five components against it.

**Spec:**

- `anatomy-format.md` says what counts as a part, how to name and nest parts, when a part
  is required, and what is not anatomy. It adds a review checklist.
- New optional `states` on a part lists the states it appears in, such as the focus indicator.
- New optional `anatomyReview` on a component records `draft` or `reviewed`.
- New info rule SPEC-073 lists components with relationships but no anatomy, or draft anatomy.

**Data:**

- Button, action-button and badge anatomy are reviewed.
- Checkbox and switch stay draft because both still carry a render-only `control` part.
- Button `label` is now optional. The focus indicator is marked state-only on all four.

**WASM:** the validator includes SPEC-073.
