---
"@adobe/design-data-spec": patch
---

Clarify that a single-size platform recipe serves every host size when nested.

- **spec/component-visuals.md**: a nested platform recipe with one `sizeScale` entry
  (such as `switch-ios`) is used at every host size; a multi-size recipe that lacks
  the size still fails to compile.
