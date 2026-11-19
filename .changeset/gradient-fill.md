---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-spec": minor
"@adobe/design-data-wasm": minor
---

Draw linear gradients in visual recipes. The avatar and the swatch use it.

- A new `gradient` value source on a box `fill`: `from` and `to` ends in the box's unit space and
  stops whose colors and offsets bind through relationships, so the `gradient-stop` tokens drive
  it. A scene node carries `gradient`; its `fill` keeps the first stop for solid-only consumers.
- An option read by an `option` source may hold a CSS `linear-gradient()` (a `deg` angle or a
  `to` side or corner, and `<color> [<percentage>]` stops). The swatch `preview` takes one.
- SVG and PNG output draw gradients. Images are still not drawn.
- Avatar: the Gradient image, Initials and Guest styles draw Figma's turquoise gradient (400, 600
  and 800 at the 0, 66 and 100 percent stops, from the top-left to the bottom-right). New
  `Background (gradient stop N)` relationships bind the stop colors.
- Dataset `requires.cli` is 0.56.0, which reads the new source.
