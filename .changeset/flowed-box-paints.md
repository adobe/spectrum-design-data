---
"@adobe/design-data-spec": patch
"@adobe/spectrum-design-data": patch
"@adobe/design-data-wasm": patch
---

A box placed directly in a row now paints itself, so checkbox and switch no longer need a
render-only `control` part.

- Renderer and JS runtime read `fill`, `stroke` and `strokeWidth` on a flowed box.
- Checkbox and switch drop `control`. The box and the track carry the size and hold the marks
  and the handle. Rendered geometry, colors and press scale are unchanged.
- Relationships that named `control` now name `box` (checkbox) or `track` (switch).
- Checkbox and switch anatomy are now reviewed.
