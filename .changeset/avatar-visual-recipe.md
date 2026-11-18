---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": minor
---

Add the avatar visual recipe and review its anatomy against Figma.

- Anatomy is `container`, `image`, `initials` and `guest-icon`. `user-image` was the same part as
  `image`. `focus-indicator`, and the `down` and `keyboard-focus` states, are removed: Figma draws
  only Default and Disabled, and React Spectrum and SWC avatars are not focusable.
- The `image` option values are `user image`, `gradient image`, `initials` and `guest`. `gradient`
  is dropped (it is the backdrop of initials and guest) and `guest image` is now `guest`.
- Size relationships pin the `size` option. New relationships bind the backdrop, the initials and
  guest glyph colors, and the stroke width. A `guest` avatar icon is added to the workflow set.
- The renderer picks a palette color for the request's color scheme when a relationship refers to
  a color set directly, and uses a component's default `size` when `m` is not one of its sizes.
  SPEC-063 accepts numeric `size` values, as the avatar declares.
