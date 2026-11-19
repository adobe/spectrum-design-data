---
"@adobe/spectrum-design-data": patch
---

Data fixes for two relationship records. Renders and legacy tokens are unchanged.

- date-picker: removed the "Popover minimum width" record
  (`5e17a7f7-00b3-50ec-b353-c28ec608d1f8`, `spacing` scope, `$ref` spacing-500 / 32px).
  A spacing token used as a width was a data error; Figma and React Spectrum show no
  32px popover width.
- select-box: the selected-border thickness record
  (`c0dcf46a-f713-5fda-89df-5e82cda2dbe0`) now points at `border-width-200` (2px)
  instead of `focus-indicator-thickness` (2px). It is a border width, not the focus
  ring. Same value, uuid, scope and context.
