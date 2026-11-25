---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-spec": patch
"@adobe/design-data-wasm": patch
---

Declare role `group` for the Checkbox group.

* Data: the Checkbox group `accessibility` block gains `role: "group"` (the only
  block change; nothing else in any block changes) and its behavior contract
  carries the same role on the `container` part, pinned in its conformance suite.
  Spec sheets and renders are unchanged: Checkbox group has no spec sheet.
* The contract still carries no arrow-key navigation: the usage prose says arrows
  move focus, while React Spectrum S2 and Web Components give each checkbox its
  own tab stop. This is an open decision (hd0g.4.15), not modeled.
* The wasm package embeds the contract, so it ships the changed data.
