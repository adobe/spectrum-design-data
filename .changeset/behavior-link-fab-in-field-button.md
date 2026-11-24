---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": minor
---

Add behavior contracts for Link, Floating action button and In-field button
(proposal 022).

* Data: `link.json` extends `interactive` and raises `press` on `activate`
  (the link declares no `isDisabled`). `in-field-button.json` and
  `floating-action-button.json` extend `press`. The floating action button
  data declares no `isDisabled`, so SPEC-118 warns once (accepted, A559).
* Bindings: web role `link` (Enter on key down, Space unbound), measured.
* Vectors: suites for the three components and the `link` key vectors.
* No accessibility block changed; the Link sheet derived from the contract
  equals the block-derived one. No render or spec sheet output changes.
