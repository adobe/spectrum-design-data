---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": minor
---

Add a close button visual recipe.

- Close button renders size, hover, down and keyboard focus, `isDisabled` and the white and black
  static colors. Down, hover and keyboard focus share one fill, as in React Spectrum.
- Close button anatomy is reviewed (`container`, `icon`, `focus-indicator`).
- The `iconSize` option is removed: Figma and React Spectrum derive the cross size from `size`.
- The hover fill relationship now points at gray-200 (was gray-100), as in Figma and React
  Spectrum. Cross size, static color and disabled color relationships are pinned in
  `scope.options`.
