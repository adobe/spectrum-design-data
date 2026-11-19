---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": minor
---

Review the anatomy of accordion, field-label, thumbnail and opacity-checkerboard. Their relationship
records now say which part they belong to (`scope.part`).

- Accordion: `item` is renamed `accordion-item` (the recipe root, so its render node ids change),
  `direct-actions` is renamed `actions`, and a state-only `focus-indicator` is added. The header's
  horizontal padding has its own "Header (horizontal)" records, not the content ones.
- Field label and thumbnail: no anatomy change. Thumbnail border records move to `container`, its
  checkerboard records to `opacity-checkerboard`.
- Opacity checkerboard: `container` is the root and `square` the tile.
- The anatomy registry drops `small-divider`, `required-asterisk` and `required-text` (unused).
- The four components are marked `reviewed`.

Drawings are unchanged. Only the root part names of accordion and opacity-checkerboard differ.
