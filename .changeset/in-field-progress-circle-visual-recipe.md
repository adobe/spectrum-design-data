---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": minor
---

Add an in-field progress circle visual recipe. It draws one fixed arc frame, since the component
has no determinate form.

- Renders size (s, m, l, xl) and the white and black static colors, all bound through
  relationships. Anatomy (track, fill) is reviewed.
- Static color records now pin `scope.options.staticColor` instead of naming the color in the
  context, and bind the `transparent-static-*` replacements for the deprecated
  `transparent-white` and `transparent-black` tokens. Their alpha moves to 0.16 and 0.96.
- Sizes follow Figma S2 Web: 16, 18, 20 and 22 px on desktop (m, l and xl were 20, 22 and 26).
  Mobile m, l and xl become 23, 25 and 28 px (desktop x 1.25); mobile s stays 18 px.
- Thickness uses `progress-circle-thickness-small` (2 px desktop, 3 px mobile) at every size, as
  Figma and React Spectrum draw it. The "S1 Thickness" medium and large records are removed.
