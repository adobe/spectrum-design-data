---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Add the options a later recipe slice and the Drop zone contract need.

- Drop zone gets `isDisabled` (boolean, default false), so the `isDisabled` state its behavior
  contract lists is an option of the component. This clears one SPEC-118 warning.
- Drop zone and Select box each get an `illustration` string option, declared as Illustrated
  message declares it. No recipe binds it yet.
- Renders are byte-identical. The embedded dataset changes, so wasm gets a patch.
