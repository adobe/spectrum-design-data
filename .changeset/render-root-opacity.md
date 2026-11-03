---
"@adobe/design-data-spec": minor
"@adobe/design-data-tui": minor
"@adobe/design-data-wasm": minor
---

Visual recipes can bind `opacity` on the root part, and the renderer honors it.

**Spec:** `component-visuals.md` says renderers read `opacity` only on the root part and
dim the whole component as one group, the way iOS dims a disabled control.

**WASM and CLI:** `render`, `site` and the JS runtime wrap the drawing in one
`<g opacity>` when the root binds `opacity`. A scene gains `opacity` only when it is bound,
so existing scene JSON and SVG are unchanged. SPEC-083 no longer flags `opacity` on a root
part. The native binary is versioned by `@adobe/design-data-tui`.
