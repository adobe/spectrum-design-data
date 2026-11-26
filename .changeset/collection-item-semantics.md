---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Collection items can carry accessibility state, key steps can address an item, and a group with no
`traversal` ignores `navigate-*`.

- An inline collection item takes `semantics` (same shape as a contract's). A vector reads them with
  the new `expect.itemAria` (per item).
- An `input` step takes `item`: the key resolves through the role of that item's part and the
  intents run on that item.
- A collection with no `traversal` declares no navigation; `navigate-*` on its group does nothing.
- Accordion headers expose `aria-expanded` from the `expanded` facet; three vectors pin it and the
  no-navigation rule.
