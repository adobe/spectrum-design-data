---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Add visual recipes for tooltip and popover.

- Both bind through the component relationships.
- The popover shadow binds the elevated drop-shadow tokens.
- The tip is a floating path part on the edge that faces the source.
- Each edge is its own anatomy part: `tip-top`, `tip-bottom`, `tip-start`, `tip-end`.
- `placement` picks the edge; popover `hideTip` draws no tip.
- The popover `default` slot moves to a new `content` part and lists `accepts`.
- Not drawn yet: popover border, tip shadow, tip radius, tooltip max width.
