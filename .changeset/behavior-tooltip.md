---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Add the behavior contract for Tooltip's trigger semantics.

* Data: `behaviors/tooltip.json` extends the new `trigger-reveal` pattern (state `isOpen`,
  `isDisabled`; part `container`, role `tooltip`, `focus: none`). Keyboard focus and hover open
  it; pointer and programmatic focus do not. Leaving, blur, a press on the trigger and `dismiss`
  close it, and leaving or blur closes it even while the other signal holds it (React Spectrum S2).
  A disabled tooltip does not open. Escape is bound to `dismiss` on key down, as in S2 and SWC.
* Tooltip declares the options `isOpen` and `isDisabled`, listed in its recipe's `notVisual`; its
  spec sheet gains two option rows and a Keyboard table (`keyboardIntents: ["dismiss"]`).
* Spec: a "Tooltip" section. Delays, one open tooltip at a time, `aria-describedby` and closing on
  `isDisabled` are adapter-owned. The `open` facet is registered (hence the wasm patch).
* Vectors: 31 contract and 4 Escape key vectors, plus mutation tests.
