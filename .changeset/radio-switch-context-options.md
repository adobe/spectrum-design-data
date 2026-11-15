---
"@adobe/spectrum-design-data": minor
---

Move option qualifiers out of the relationship `context` strings of `radio-button` and `switch`
and into `scope.options` (rule SPEC-093).

* `Control (selected, non emphasized)` and `Control (selected, emphasized)` become `Control`
  with `isSelected` and `isEmphasized` pinned. `Control (disabled)` and `Label (disabled)`
  become `Control` and `Label` with `isDisabled` pinned.
* `switch` track fills move to the `Track` context.
* `radio-button` selected fills move from `content-color` to `background-color`, matching
  `switch`.
* The foundation recipes are updated. Render output is unchanged.

A platform recipe that binds the old context strings must use the new ones. Record `uuid`
values do not change.
