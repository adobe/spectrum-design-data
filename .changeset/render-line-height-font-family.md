---
"@adobe/design-data-spec": minor
"@adobe/design-data-tui": minor
"@adobe/design-data-wasm": minor
---

Visual recipes can bind `lineHeight` and `fontFamily` on text parts, and the renderer honors them.

**Spec:**

- `component-visuals.md`: a `text` part is as high as its line box. A `lineHeight` ending in
  `px` is that height, a unitless one multiplies `fontSize`, and with none it stays 1.3 times
  `fontSize`. A bound `fontFamily` leads the SVG font stack.

**WASM and CLI:** `render`, `site` and the JS runtime apply both the same way. A recipe that
binds neither renders exactly as before; foundation snapshots and goldens are unchanged. A scene
node gains `font_family` only when the recipe binds it. `button-ios` now binds both, so its
Medium height is 39.04 against Figma's 39. The native binary is versioned by
`@adobe/design-data-tui`.

Bump levels: all three are minor because the renderer gains a capability and no output changes
for existing foundation recipes.
