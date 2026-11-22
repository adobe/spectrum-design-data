---
"@adobe/design-data-spec": minor
---

Add a `floating` property to component visual recipes. A top-level part with
`floating` (`side`, `align`, `offset`, `crossOffset`) is drawn outside the root,
beside one of its edges, for overlays, tips and loupes, and is present when its
`visibleWhen` holds. The scene now grows to hold floating parts and the full
drop shadow (blur, offset, spread) instead of cutting shadows at the 8px
margin. Add rule SPEC-112, which checks a floating part's declaration.
