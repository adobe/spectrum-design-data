---
"@adobe/spectrum-design-data": patch
---

Drop six redundant `when` entries from the `radio-button` and `switch` visual recipes. Each
bound the same relationship selector as an entry that stays, and the records' `scope.options`
pins already choose the disabled and emphasized values. Renders are unchanged.
