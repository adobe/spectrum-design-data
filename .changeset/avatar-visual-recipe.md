---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": minor
---

Add the avatar visual recipe and review its anatomy against Figma.

- Anatomy is `container`, `image`, `initials` and `guest-icon`. `user-image` is removed: it was
  the same part as `image`. `focus-indicator` and the `down` and `keyboard-focus` states are
  removed too: Figma draws only Default and Disabled, and React Spectrum and SWC avatars are not
  focusable.
- The `image` option value `guest image` is renamed `guest`, and `gradient` is removed (it is the
  backdrop of initials and guest). The values are `user image`, `gradient image`, `initials`
  and `guest`.
- Size relationships pin the `size` option. New relationships bind the backdrop, the initials and
  guest glyph colors, and the stroke width. The workflow icon set gains `user`, drawn for guest.
- The renderer picks a palette color for the request's color scheme when a relationship refers to
  a color set directly, and renders at a component's default `size` when the implicit `m` is not
  one of its sizes. SPEC-063 accepts numeric `size` values.
