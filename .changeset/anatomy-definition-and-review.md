---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Define what an anatomy part is and review the first five components against it.

**Spec:**

- `anatomy-format.md` says what counts as a part, how to name and nest parts, when a part
  is required, and what is not anatomy. It adds a review checklist.
- New optional `presentIn` lists the states a part is present in. Not allowed on a required part.
- New optional `anatomyReview` on a component records `draft` or `reviewed`.
- New info rule SPEC-073 lists components with relationships but no anatomy, or draft anatomy.
- New warning SPEC-074: a part's `presentIn` states must be declared on the component.
- New warning SPEC-075: a recipe's `visibleWhen.states` must agree with the part's `presentIn`.

**Data:**

- Button, action-button and badge anatomy are reviewed.
- Button `label` is now optional. The focus indicator is state-only on all four.

**WASM:** the validator includes SPEC-073 to SPEC-075.
