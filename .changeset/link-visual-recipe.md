---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-spec": minor
"@adobe/design-data-wasm": minor
---

Add the link visual recipe, and `textDecoration` so a `text` part can draw an underline.

- New `text` props: `textDecoration` (`underline` or `none`), `underlineThickness` and
  `underlineOffset`. A scene text node carries `underline: {thickness, offset}`. SVG and PNG draw
  the line under the label in the text color, with the baseline 0.35 x the font size below the
  center of the line box.
- Link draws primary and secondary, standalone and inline, quiet, and white and black static
  colors, with hover, down and keyboard-focus. A quiet standalone link underlines on hover and
  keyboard focus, as React Spectrum does. Anatomy is reviewed: `text` and `focus-indicator`.
- New `isStandalone` option (Figma Placement, React Spectrum `isStandalone`). The `icon` part is
  removed: only Figma has it, hidden in every variant.
- Relationships pin `isStandalone` for font weight, use the `Text` context, and bind the static
  colors to `transparent-static-white-1000` and `transparent-static-black-1000`.
