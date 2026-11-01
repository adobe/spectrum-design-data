---
"@adobe/design-data-spec": minor
"@adobe/design-data-tui": patch
"@adobe/design-data-wasm": patch
---

Fix corner rounding when a recipe's radius is larger than half the box.

**Spec:** `component-visuals.md` gains a normative rule: a uniform `cornerRadius` larger than half
the shorter side of its box is clamped to that value, so the corner stays circular.

The renderer clamps a uniform corner radius to `min(radius, width/2, height/2)`, like CSS
`border-radius`. Before, an SVG `rx` larger than half the height drew an ellipse.

**Rendered output changes for existing recipes.** Foundation Button icon-only and pending
variants at the mobile scale (a box narrower than tall) go from elliptical to round corners
(for example 38x40 with a 20 radius now draws 19). The focus ring and the outline stroke
follow. 72 of the 96 Button option sets in `recipe-snapshots.json` change; the other
components are unchanged. Desktop output is unchanged.

Bump levels: patch for wasm and tui, because this fixes wrong output and adds no API. The spec
is minor because a new normative rule applies to every renderer. The native binary is versioned
by `@adobe/design-data-tui`.
