---
"@adobe/spectrum-design-data": minor
---

Move option qualifiers out of the relationship `context` strings of `action-button` and into
`scope.options` (rule SPEC-093).

* `Background (selected, emphasized)` and `(selected, non emphasized)`, `(disabled)`,
  `(disabled, black)` and `(disabled, white)` become `Background` with `isSelected`,
  `isEmphasized`, `isDisabled` and `staticColor` pinned. `Label, icon, and hold icon` and
  `Focus ring (black)` / `(white)` follow the same pattern.
* Two records are added so that selected + disabled resolves to the disabled token, as the
  recipe's `when` order did before.
* **Render change:** the keyboard-focus ring of a static black or white action button is now
  black or white. The `Focus ring (black)` and `(white)` records were not reachable before, so
  the ring fell back to the default blue. All other states render unchanged.

A platform recipe that binds the old context strings must use the new ones. Record `uuid`
values do not change.
