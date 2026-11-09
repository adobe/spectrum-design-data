---
"@adobe/design-data-spec": minor
---

Component visuals: a root can bind `width` and `minWidth`, and a part can
`grow` to fill the rest of a row.

The root's outer width is `max(minWidth, width)`, padding inside it; a root
with neither still hugs its content. `grow` (`true` or a positive share) on a
`box` or `text` in a row splits the space left after the other parts, gaps and
padding. A render request gains an optional `width` (px), the demo width, which
overrides the recipe's `width` but not its `minWidth`. A fixed width narrower
than the content overflows without clipping and adds a scene diagnostic.
`component-visual.schema.json` accepts `grow`. A flowed row box with no `width`
now fills a column root. SPEC-083's fixture uses `rotation` on a box, since
`minWidth` is now read.
