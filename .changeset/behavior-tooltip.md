---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Add the behavior contract for Tooltip's trigger semantics.

* Data: `behaviors/tooltip.json` (part `container`, role `tooltip`, `focus: none`; state `isOpen`
  and `isDisabled`) extends the new `trigger-reveal` pattern. Keyboard focus and hover open the
  tooltip; pointer and programmatic focus do not. Hover or keyboard focus keeps it open: leaving,
  blur, a press on the trigger and `dismiss` close it. A disabled tooltip does not open. The `open`
  facet is registered. Escape is bound to `dismiss` for the web role `tooltip`.
* Spec: a "Tooltip" section in the behavior contract page. Delays (warmup, cooldown, global
  warmup), one open tooltip at a time and `aria-describedby` on the trigger are adapter-owned.
* Vectors: 23 contract vectors and 4 Escape key vectors. Mutation tests fail when a transition,
  guard, fallback, facet or the Escape binding is broken.
* Tooltip declares the options `isOpen` and `isDisabled` (boolean, default false) that the contract
  lists in `state`, and its recipe lists them in `notVisual`. The spec sheet options table gains
  two rows.
* The Tooltip accessibility block gains `keyboardIntents: ["dismiss"]`, so its spec sheet gains a
  Keyboard table. No render or other spec sheet changes. The registry change touches the embedded
  registry data, hence the wasm patch.
