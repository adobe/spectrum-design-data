---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Add the visual recipe for illustrated-message.

- illustrated-message: a centered column with the illustration image fill (placeholder),
  title, description and a `button-group` slot of buttons. The width follows `orientation`;
  type and colors read the relationship records.
- The component gains a `button-group` slot (up to two buttons), a temporary stand-in for
  the nested group (bead 5m92.32.22), as in the dialogs and coach-mark.
- The 16 title relationship records point at the final token, not at a `title` record that
  carries a context, which a recipe binding cannot follow. Values are unchanged.
- The title font-size records name the token of their own scale, so the sheet shows each scale's value.
- Not drawn yet: the illustration (a zero-height box: no size record, qkj5.243); spacing between
  parts (qkj5.288; a column root takes one gap); the horizontal layout (the `horizontal` golden is
  the vertical column at 512 px); wrapped lines are left-aligned in the centered column.
