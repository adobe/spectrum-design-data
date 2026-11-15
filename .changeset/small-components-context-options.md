---
"@adobe/spectrum-design-data": patch
---

Move option qualifiers out of 21 relationship contexts in ten small components and into
`scope.options` (rule SPEC-093): `tabs`, `action-group`, `button-group`, `illustrated-message` and
`swatch-group` pin `orientation` or `density`, `progress-bar` pins `staticColor: white`, and
`color-handle`, `search-field`, `field-label` and `help-text` pin `isDisabled`. A default pin is
dropped only where records for the same property cover every other declared value (the regular
`action-group` spacing). None of these components has a visual recipe, so nothing renders
differently.
