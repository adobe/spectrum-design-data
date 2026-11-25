---
"@adobe/spectrum-design-data": patch
---

Migrate body and heading relationship records to structured identity (level 2). The status check
now reads level 3 for both (the recipe check is not applicable: one anatomy part, `text`, and no
recipe). The legacy `@adobe/spectrum-tokens` output is byte-identical.

- All 119 live records already had `scope.part: text`. Ten identities (property, part) mixed
  records with `context: "Text"` and records with no `context`. The 101 `Text` records lose that
  `context` (37 in body, 64 in heading), so each identity has one authored context. The 15
  context-less records, which other components reference by uuid as scoped tokens, are not
  touched. No uuid, `legacyKey`, `$ref`, option or `contextRole` changes; deprecated records are
  untouched.
- Spec sheets for body and heading change shape: the 37 and 64 records that sat in one `Text`
  block now sit in per-property blocks with their siblings. Every record still appears once.
  Renders and every other component's sheet are unchanged.
