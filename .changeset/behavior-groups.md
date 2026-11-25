---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
---

Add behavior contracts for the group components.

* Data: contracts for Button group, Swatch group, Checkbox group and
  Avatar group: a `container` part with `focus: none` and the role the
  component declares (Checkbox group declares none, so none is carried),
  the `orientation` and `disabled` facets where the options exist, and
  vectors with `pins`. Item behavior stays in the item contracts.
* No accessibility block, format, runner or CLI change; renders and spec
  sheets are unchanged. Open questions are beads under hd0g.4.
