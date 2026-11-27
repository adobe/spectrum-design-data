---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Deprecate five components (`lifecycle.deprecatedIn` on the component files).

- `single-calendar`, `double-calendar`, `triple-calendar`: use `calendar` with
  its `months` slot (option `visibleMonths` 1, 2 or 3) instead. Owner decision
  A729 a. Their two records each stay frozen with their legacy keys and are not
  marked deprecated, so legacy output does not change.
- `scroll-zoom-bar`, `bottom-navigation-android`: no records, no anatomy and no
  recipe, and the migration had already dropped them. Owner decision A733 a.

No record, relationship, recipe or behavior changes. `validate-dataset`,
`status`, `behavior test --all` and `spec-sheet --all` are unchanged.
