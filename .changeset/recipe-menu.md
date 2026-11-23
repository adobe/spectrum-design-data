---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Add a visual recipe for menu.

- The menu draws its items as a repeat: each item has a leading check
  mark (single selection), nested checkbox or switch (multiple), icon or
  thumbnail, label and value, with hover and keyboard-focus fill and
  disabled colors. Sizes s, m, l and xl bind live base tokens.
- Options: `isSelected`, `isDisabled`, `value`, `hasIcon` and `hasThumbnail`
  on the component, and `isSelected`, `hasIcon` and `hasThumbnail` on
  `items[]`. Anatomy parts checkmark, checkbox, switch, icon, thumbnail
  and value gain `presentWhen`.
- The four menu-item `Rounding` records are pinned to a size (s 7px,
  m 8px, l 9px, xl 10px) so the radius binds through the relationship.
- Not drawn: sections and section headers, submenus, indent, truncation,
  description, the container surface and the focus ring.
- Snapshots and goldens are regenerated. Legacy token output is unchanged.
