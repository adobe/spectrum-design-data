---
"@adobe/design-data-spec": minor
"@adobe/design-data-wasm": minor
"@adobe/spectrum-design-data": patch
---

Visual recipes can draw a second stroke, stack parts and pick a stroke by position.

* Root props `innerStroke`, `innerStrokeWidth` and `innerStrokeOpacity` draw a second border
  just inside the first, over the children, as the ring node `<root>.inner-border`.
* A root with `direction: "stack"` overlays its children in declaration order.
* A relationship selector can add `position: "inner"` or `"outer"` (default outer). A record
  pinned to one position serves only that selector, so two strokes no longer collide.
* A nested component now inherits a corner radius given as a ratio of the host height.
* The swatch draws its checkerboard behind the fill and its inner band when selected.
