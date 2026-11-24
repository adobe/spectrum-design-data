---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": minor
---

Add the behavior contract for Clear button (proposal 022).

* Data: `clear-button.json` extends `press` and raises `press` on `activate`,
  the same shape as Close button. It is a subcomponent; the flag does not
  change any contract rule.
* Bindings: the existing web role `button` applies without edits.
* Vectors: a suite for the component.
* No accessibility block changed; the Clear button sheet derived from the
  contract equals the block-derived one. No render or spec sheet output changes.
