---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Add the Accordion behavior contract, the second to use the `collection` block.

- Data: Accordion has an inline item contract. Its header has role `button`,
  `tab-stop` focus and `press: activate`. `activate` chooses `isExpanded`
  unless the item is disabled, and emits `change`. The `choose` mode comes
  from the new facet `expansion` (`isMultiple`: single or multiple) and
  `allowsEmpty` is true, so closing the open item leaves none open. There is
  no `traversal`: headers are not an arrow-key group.
- Registry: facets `expanded` (`collapsed`, `expanded`) and `expansion`
  (`single`, `multiple`).
- Spec: 12 conformance vectors; the Collections section names Accordion.
- The `accessibility` block stays; the spec sheet and the render are
  unchanged. The embedded registry changes, hence the wasm patch.
