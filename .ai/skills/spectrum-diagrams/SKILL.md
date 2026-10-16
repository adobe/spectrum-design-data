---
name: spectrum-diagrams
description: >-
  Produces on-brand technical/software-architecture diagrams for the docs-site articles
  (`docs/site/src/articles/`), using the Figma MCP's `generate_diagram` (Mermaid → FigJam)
  plus a Spectrum recolor pass, then exports the result as an image embedded in the
  article. Use when an article needs a flowchart, architecture diagram, pipeline, or tier
  diagram — including filling an `<!-- Illustration: ... -->` placeholder comment left in
  an article for a diagram that hasn't been made yet.
trigger: /spectrum-diagrams
license: Apache-2.0
---

# Spectrum diagrams for docs articles

Turns a real technical structure (code, tokens, spec, pipeline) into a diagram that looks
like it belongs next to Spectrum's own docs, and embeds it in an article.

This skill is a **workflow on top of** the Figma MCP's own skills — it doesn't
re-document their tool mechanics. Load those when this skill tells you to.

## When to use this

* An article has an `<!-- Illustration: ... -->` placeholder comment for a diagram
  (the established convention in this repo — see `understanding-spectrum-tokens.md`).
* Someone asks for an architecture diagram, flowchart, pipeline, or tiered/cascade
  diagram to go in a `docs/site/src/articles/*.md` file.

**Not for:** decorative hero illustrations or brand illustration (bell/cloud/lightbulb
style icons). Those come from the real S2 Illustrations Figma library, not
`generate_diagram` — see [Illustration guardrails](#illustration-guardrails) below. If a
placeholder asks for one, say so and point at the library rather than faking one with
`generate_diagram`.

## Workflow

### 1. Gather the real structure first

Read the actual code, tokens, or spec the diagram represents before writing any Mermaid.
Don't invent services, edges, or tiers to "round out" a diagram — a partial, accurate
diagram beats a polished, hallucinated one. If the article prose already describes the
structure (tables, code blocks), that prose is the source of truth; walk it node by node.

### 2. Load `/figma-generate-diagram` and pick the type

This is **mandatory before calling `generate_diagram`** (per the Figma MCP server's own
instructions). It routes you to type-specific guidance and sets universal Mermaid
constraints (no emojis, no `\n` in labels, reserved words, etc.) — follow it, don't
duplicate it here.

Two shapes come up repeatedly in this repo's articles:

* **Real software architecture** (services, datastores, queues, external calls) →
  the *architecture* layout: `flowchart LR`, every node inside one of the fixed subgraphs
  (`client`/`gateway`/`service`/`datastore`/`external`/`async`), pass
  `useArchitectureLayoutCode: "FIGMA_DIAGRAM_2026"`.
* **Conceptual structure** (token tiers, a cascade/precedence model, a pipeline of
  stages) → a plain `flowchart` (see the Figma skill's `flowchart.md` reference). No
  subgraph-ID constraint applies here — use whatever grouping reads clearly.

### 3. Generate

Call `generate_diagram`. If you're iterating on the same diagram, or adding a second
diagram that should live beside the first, pass the same `fileKey` instead of creating a
new draft file each time (the Figma skill covers this).

### 4. Spectrum-aligned recolor pass (do this — it's why this skill exists)

`generate_diagram` auto-assigns colors that aren't Spectrum's, and the FigJam board
can't have its font changed to Adobe Clean. Close the color gap (font is an accepted
limitation of this output path — leave it):

1. Load `/figma-use-figjam` (FigJam-specific `use_figma` guidance) — mandatory before
   editing FigJam nodes. It documents FigJam's **coordinated shape presets**
   (`figjam-colors.md`): each `shape-with-text` node takes a fill+stroke+text triad from
   a fixed palette, not arbitrary hex — an off-palette color renders as "custom" in the
   FigJam UI and can't be re-picked from the swatch picker.
2. Read `references/spectrum-brand.md` for the mapping from Spectrum's semantic intent
   (neutral/raw, structural, accent/emphasis, final-result) onto the closest FigJam
   preset — this skill does **not** inject raw Spectrum hex into FigJam shapes.
3. Read `references/diagram-house-style.md` for the *composition* rules on top of those
   presets — which node gets the accent (and why), how to show precedence without a
   color-per-stage, when to drop repetitive edge labels, and layout/caption discipline.
   This is what keeps diagrams from reading as default-tinted flowcharts.
4. Call `get_figjam` first to get real node IDs (don't guess — `use_figma`'s `console.log`
   isn't returned, only the `return` value is).
5. Use `use_figma` to set `shape.fills`/`shape.strokes`/`shape.text.fills` per node from
   the coordinated preset, and `connector.strokes` to a dark/neutral connector-palette
   color (not a bright accent — connectors should recede). Never `figma.createPage` in
   FigJam.
6. Run the `diagram-critic` agent against the Mermaid source + a screenshot before final
   export (see `diagram-house-style.md`'s Review loop) — apply its findings in one batch.
7. Skip steps 3–6 only for a quick throwaway/exploratory diagram, not for anything going
   into a published article.

### 5. Capture

Use `get_screenshot` on the finished board (pass a high `maxDimension` — the default 1024
is too low-resolution once a board has several diagrams side by side) and save the
result to:

```
docs/site/src/assets/images/<article-slug>-<diagram-name>.png
```

(`src/assets/images/` already has a passthrough wired in `eleventy.config.js` — no build
changes needed. SVG export is preferable when FigJam's export supports it cleanly; PNG is
the fallback.)

**If several diagrams share one FigJam board/page**, `get_screenshot` only takes a
`nodeId` — there's no single node per diagram to target, so screenshot the whole page and
crop locally. Use `get_figjam` to read each node's `x`/`y`/`width`/`height` and compute a
bounding box per diagram; crop with ImageMagick (`magick board.png -crop
WxH+X+Y diagram.png`), not `sips` (`sips -c`/`--cropOffset` crops from the image
**center**, not top-left — easy to get a wrong region that silently looks plausible).
FigJam's canvas background is a light gray, not white — normalize it to match the site's
white article background: `magick diagram.png -fuzz 3% -fill white -opaque "#f5f5f5"
-trim +repage diagram.png`.

### 6. Embed in the article

Replace the `<!-- Illustration: ... -->` placeholder comment (or add a new image) with:

```md
![Alt text describing the diagram](/assets/images/<article-slug>-<diagram-name>.png)
```

Root-relative path — the site's `HtmlBasePlugin` adds the `/spectrum-design-data`
pathPrefix automatically. Write real alt text describing what the diagram shows, not the
filename.

If a diagram truly needs to be pixel-perfect on-brand (exact Spectrum token colors, no
FigJam limitations at all), the alternative is hand-authoring inline SVG directly in the
article body using `var(--spectrum-*)` custom properties (already loaded site-wide via
`@spectrum-css/tokens`). That's more effort per diagram and is the exception, not the
default path this skill optimizes for.

## Illustration guardrails

These apply whenever a diagram or the surrounding article touches actual Spectrum
illustration assets (icons like a bell, cloud, lightbulb, confetti — not
`generate_diagram` node shapes):

* **Never invent or recolor an illustration.** Pull real assets from the S2
  Illustrations Figma library (via `download_assets` / the library file) instead of
  drawing one from scratch.
* **Linear (monochrome, gray-800) is the low-attention default** — safe to use multiple
  times in one layout (e.g. several cards). Use it for routine UI/empty-state style
  callouts.
* **Gradient illustrations are high-attention** — at most one per view, never in error or
  critical-message contexts (their colors carry positive/semantic meaning that conflicts
  with error framing).
* Sizes are fixed: **S 48×48, M 96×96, L 160×160** — don't resize or restyle.

## What NOT to do

* Don't call `generate_diagram` for pie charts, mindmaps, venn diagrams, class diagrams,
  or timelines — it doesn't support them (the Figma skill lists the supported types).
* Don't skip step 4 for anything shipping in an article — an un-recolored, auto-styled
  FigJam export doesn't read as Spectrum.
* Don't regenerate more than twice on the same complaint — stop, ask what's specifically
  wrong, or suggest editing directly in FigJam.
