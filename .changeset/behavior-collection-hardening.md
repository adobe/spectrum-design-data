---
"@adobe/design-data-spec": patch
"@adobe/design-data-wasm": patch
---

Harden the behavior contract `collection` block.

* Spec: `traversal.focus` is metadata only (the runner does not model focus), in the schema
  description and the Collections section. The section also says that the runner fails an
  expectation on `items` or `focused` without `start.items`, and a start item that sets an option
  its item contract does not list. A disabled group still navigates in the runner, because the
  group's `isDisabled` reaches its items in the adapter; the radio group vector says so.
* Rules: SPEC-120 numbers `expect.items` per expectation, so a vector with several expectations
  no longer gets false "expects item N" warnings.
* Runner: fails a vector that expects `items` or `focused` with no group, and a start item with an
  option the item contract does not declare (a mistyped `isDisabeld`). New tests pin
  `navigate-last`, the last-on guards of `single` and `multiple`, and a choose that changes nothing.
* No render, spec sheet or wasm size change. Linting the separate suite vectors with SPEC-118 to
  SPEC-120 is a follow-up.
