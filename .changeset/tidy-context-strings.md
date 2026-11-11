---
"@adobe/spectrum-design-data": patch
---

Normalize relationship context strings: trim stray whitespace and merge case
variants of the same string (52 strings, 210 relationship records, 1 component
tokenBinding). One string had an embedded paragraph break collapsed to a single
space. Nothing is renamed beyond case and whitespace; recipes and render
snapshots are unchanged.
