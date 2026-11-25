---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Add the `collection` block to behavior contracts; the radio group's rules become data.

* Spec: a group contract may carry `collection` (`slot`, `item`, `choose`, `traversal`). The new
  item action `do.choose` is resolved by the group (single, multiple or none; `allowsEmpty`) and
  raises one group `change` with the indices that are on. Traversal says `wrap`, `skip`,
  `first`, `last`, `selectOnMove` and `mirror` (swaps ArrowLeft and ArrowRight while a group
  guard holds). Vectors gain `start.items`, `start.focused`, item steps, `expect.items` and
  `expect.focused`. SPEC-118 to SPEC-120 check them. New "Collections" section answers proposal
  022 question 5 (a group is a collection).
* Data: Radio group declares its `collection` (single choice, wrap, skip a disabled radio,
  select on move, mirror while `arrowOrder` is `mirrored`). Radio button's `activate` uses
  `choose`, and its `navigate-next` and `navigate-previous` transitions are removed. The arrow
  bindings move from role `radio` to role `radiogroup`. The four dead group vectors and the
  "lands on a radio" key vectors are replaced by group vectors.
* Runner: executes a group over its items by index. Mutation tests fail when wrap, skip, mirror,
  select-on-move, a choose mode or a pair of arrow bindings is broken.
* No render or spec sheet change. Embedded contracts change slightly, hence the wasm patch.
