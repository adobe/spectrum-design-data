---
"@adobe/spectrum-design-data": patch
---

Remove 3 duplicate/typo'd tokenBindings on cards (SPEC-027 dangling-binding triage).

- **packages/design-data/components/cards.json**: removed
  `card-edge-to-content-{compact,default,spacious}-extra-medium` bindings — exact
  duplicates of the existing `-medium` bindings with an invalid `-extra-` scale step
  that doesn't exist in the token set.
