---
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

Remove stale data the Design decisions retired. No render changes.

- `combo-box`: remove the unused `placeholder` anatomy part (React Spectrum has none).
- `calendar`: remove the unused `current-day-indicator` content-color relationship; the
  recipe already binds the day content color through the `day` relationship.
- `close-button` docs no longer list the removed `iconSize` option.
