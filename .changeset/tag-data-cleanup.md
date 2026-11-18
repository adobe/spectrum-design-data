---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": minor
---

Clean up tag data so a visual recipe can choose between its records. Anatomy is a draft until
the owner reviews it.

- Tag declares `size` (s, m, l), `icon`, `isSelected` and `isEmphasized`. `isReadOnly` is removed:
  Figma and React Spectrum have no read-only tag.
- Background and label/icon color records pin `isSelected`, `isEmphasized` and `isDisabled`, plus
  `state` for hover, down and keyboard focus. Emphasis recolors selected tags only, as in React
  Spectrum.
- The emphasized label color binds `transparent-static-white-1000`, the replacement for the
  deprecated `color-white`. "Icon and Clear icon" contexts become "Label and icon".
- Avatar size records pin `size` and `hasAvatar`; image size records pin `size`.
- Anatomy replaces `clear-icon` and `cross-icon` with container, avatar, icon, label,
  clear-button and focus-indicator. `clear-button` is a new anatomy term.
