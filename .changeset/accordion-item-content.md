---
"@adobe/spectrum-design-data": minor
---

Accordion: expanded items now draw their content.

- The `content` part of the recipe is a text part bound to the entry's `content`,
  through a new string option `content` and `repeat.with.content`.
- It uses the title's font and colour relationships and the content padding relationships.
- A collapsed item, or an expanded one with no content, draws no content area.
