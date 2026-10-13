# Spectrum brand anchors for diagrams

Values below are pulled directly from the Figma S2 Web variables file
(`https://www.figma.com/design/rNdFQYqXO2Nd3zMWnQD5U4/S2---Web--POC-`, node `9308:53906`)
via `get_variable_defs`. Treat these as the confirmed anchors for the recolor pass —
don't hardcode any Spectrum color beyond this list from memory. For anything not listed
here (an exact semantic token value, a product-brand color, a less common gray step),
resolve it live rather than guessing:

* On the docs site itself, the full ramp is already loaded as CSS custom properties via
  `@spectrum-css/tokens` — `var(--spectrum-<name>)`.
* In this repo, `packages/tokens` and the `design-data` MCP server (`query_tokens`,
  `resolve_token`) are the source of truth.

## Confirmed color anchors

| Role                                                           | Value                | Notes                                                                                                                                                           |
| -------------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary line/text (linear illustrations, node borders, labels) | `#292929`            | Spectrum gray-800. Used for *all* linear illustrations regardless of light/dark (the illustration flips to gray-800's dark-mode pair, not to a different step). |
| Neutral background default                                     | `#292929`            | `Alias/background/neutral/default`                                                                                                                              |
| Neutral background hover                                       | `#131313` (gray-900) |                                                                                                                                                                 |
| Accent (brand blue)                                            | `#3b63fb`            | `Alias/background/semantic/accent/default` — use for primary/emphasized nodes or edges                                                                          |
| Accent hover                                                   | `#274dea`            |                                                                                                                                                                 |
| Negative/error                                                 | `#d73220`            | `Alias/background/semantic/negative/default` — use only for genuinely erroring nodes, never decoratively                                                        |
| Negative hover                                                 | `#b72818`            |                                                                                                                                                                 |
| Surface white                                                  | `#ffffff`            | gray-25 / white                                                                                                                                                 |
| Surface gray-100                                               | `#e9e9e9`            | disabled background                                                                                                                                             |
| Surface gray-200                                               | `#e1e1e1`            |                                                                                                                                                                 |
| Surface gray-300                                               | `#dadada`            | disabled border                                                                                                                                                 |
| Surface gray-400                                               | `#c6c6c6`            | disabled content                                                                                                                                                |
| Disabled content                                               | `#c6c6c6`            |                                                                                                                                                                 |
| Disabled border                                                | `#dadada`            |                                                                                                                                                                 |

## Type

Font family: `Adobe Clean Spectrum VF` (weight 700 / Bold for component-scale labels).
**FigJam limitation:** `generate_diagram` output can't have its font changed via the MCP
tools. Leave the FigJam default font — this is an accepted gap of the FigJam output path,
not something to work around with `use_figma`.

## Recolor mapping: FigJam shape presets (not raw hex)

FigJam's `shape-with-text` nodes take a coordinated fill+stroke+text triad from a fixed
palette (see `figjam-colors.md` in the `figma-use-figjam` skill's references) — writing
Spectrum's raw hex directly onto a shape makes FigJam treat it as "custom" and breaks the
palette-swatch picker. So the recolor pass maps Spectrum's *semantic intent* onto the
**closest FigJam preset**, not onto the literal accent-anchor hex above:

| Semantic role                      | FigJam preset                                             | Use for                                                                                                       |
| ---------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Neutral / raw input                | `lightGray`                                               | Primitives, foundation/base layer, client apps                                                                |
| Structural / intermediate          | `gray`                                                    | Platform layer, structural tokens, gateways                                                                   |
| Accent / what the diagram is about | `blue`                                                    | The one tier, service, or stage the diagram exists to highlight — use sparingly, on at most a couple of nodes |
| Final result / highest emphasis    | `black`                                                   | The resolved/output node, if the diagram ends in one                                                          |
| Connectors/edges                   | dark neutral (`Black #1E1E1E` from the connector palette) | All edges — connectors should recede, never carry the accent color                                            |

For **architecture diagrams** (fixed subgraph IDs), a reasonable default mapping:

| Subgraph ID | Preset                                                            |
| ----------- | ----------------------------------------------------------------- |
| `client`    | `lightGray`                                                       |
| `gateway`   | `gray`                                                            |
| `service`   | `blue` if it's the service the diagram is about, else `lightGray` |
| `datastore` | `gray`                                                            |
| `external`  | `lightGray` (muted — it's outside your system)                    |
| `async`     | `lightGray` (dotted edges already signal async, don't over-color) |

Don't rainbow-color a diagram just because more presets are available — Spectrum's own
diagrams read as restrained, not decorative. **At most one `blue` node per diagram** — see
`diagram-house-style.md` for exactly which node earns it, how to show precedence without a
color-per-stage, and the rest of the composition rules that apply on top of this preset
mapping.

The confirmed hex anchors above remain useful for anything **outside FigJam** — inline
SVG diagrams, or a Figma Design file with real Spectrum variables bound.

## Illustration guidelines (condensed)

Full source: Spectrum Brand team illustration guidelines
(`s2.spectrum.corp.adobe.com/page/illustration/`, mirrored locally at
`~/Downloads/illustrations-images/illustrations.md` at time of writing).

* Two styles: **linear** (monochrome, gray-800, low attention hierarchy — safe to repeat
  across a layout) and **gradient** (color, high attention — at most one per view, never
  in error/critical contexts because gradient colors carry positive semantic meaning).
* Fixed sizes: **S 48×48px, M 96×96px, L 160×160px**. Never resize/rescale — stroke
  weight and corner radii are tuned per size.
* Never create your own illustration or recolor an existing one. Pull the exact asset
  from the S2 / Illustrations Figma library
  (`figma.com/design/xGhSI7y1ewp2fEiX5eNOKv/S2-%2F-Illustrations`) and use it as-is. If a
  needed illustration doesn't exist, that's a Workfront request to the Spectrum Brand
  team, not something to generate.
* Gradient illustration colors are tied to specific Adobe product categories — don't mix
  a product's gradient with another product's context.
* These rules govern actual illustration assets (bell, cloud, confetti, lightbulb, etc.),
  not `generate_diagram` node/edge shapes, which follow the recolor mapping above instead.
