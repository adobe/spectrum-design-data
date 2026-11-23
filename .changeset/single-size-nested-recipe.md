---
"@adobe/design-data-spec": patch
---

Clarify that a single-size platform recipe serves every host size when nested.

- **spec/component-visuals.md**: the Nested recipes Platforms bullet now says a platform recipe with one `sizeScale` entry (such as `switch-ios`) is used at every host size; a multi-size recipe missing the size still fails to compile.
