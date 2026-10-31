# Component visuals

**Spec version:** `1.0.0-draft` (see [Overview](index.md))

This document defines the **component visual recipe**: a renderer-neutral description of how a component looks, bound to design tokens. A recipe lets tooling produce SVG, PNG, and Figma output, plus anatomy and spec overlays, from one source. It is not tied to Figma, React, or any other platform.

Status: **draft / RFC**. The schema is [`component-visual.schema.json`](../schemas/component-visual.schema.json). A pilot recipe lives at `packages/design-data/visuals/action-button.json`.

## Goals and non-goals

**Goals**

* One data source drives three views of a component: a variant × state matrix (usage), anatomy callouts, and token-labelled measurements (specs).
* Every geometric or paint value is token-bound, so overlays can name the token behind each measurement.
* Output targets are plural: SVG first, then PNG, then Figma.

**Non-goals**

* Pixel parity with every platform implementation. Recipes describe the Spectrum design spec, not a browser's rendering of it.
* Replacing component declarations. Options, states, slots and anatomy stay in [component format](component-format.md).
* Describing interaction, motion or accessibility behavior.

## Layers

| Layer                 | Owns                                                                      | Where                                  |
| --------------------- | ------------------------------------------------------------------------- | -------------------------------------- |
| Component declaration | Options, states, slots, anatomy names                                     | `components/<name>.json`               |
| **Visual recipe**     | Part tree, layout, shape, paint, text, token bindings                     | `visuals/<name>.json` (this spec)      |
| Render request        | Which component, option values, states and modes to draw; matrices        | Tool input (not stored in the dataset) |
| Scene graph           | Resolved rects, paths, text, groups, measurements with part and token ids | Renderer output; backends consume it   |

**NORMATIVE:** A recipe **MUST** name exactly one component through `component`, and that component **MUST** be declared. *Planned Layer 2 rule; not yet enforced.*

**NORMATIVE:** Every key of `parts` **MUST** be a declared anatomy part of the component. *Planned Layer 2 rule; not yet enforced.* Recipes therefore require components to declare anatomy.

## Recipe object

| Field         | Type   | Required    | Description                                                                                                            |
| ------------- | ------ | ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| `specVersion` | string | RECOMMENDED | Spec version label.                                                                                                    |
| `component`   | string | REQUIRED    | Component `name`.                                                                                                      |
| `root`        | string | REQUIRED    | Key of the root part in `parts`.                                                                                       |
| `sizeScale`   | object | OPTIONAL    | Maps each `size` option value to a numeric scale index (e.g. `m` → `100`). Enables `{sizeIndex}` in selectors.         |
| `notVisual`   | array  | OPTIONAL    | Component options and states that deliberately have no visual in this recipe (for example `["isReadOnly"]`). SPEC-066. |
| `parts`       | object | REQUIRED    | Map of anatomy part name → part definition.                                                                            |

### Part

| Field         | Type             | Description                                                                                                                                                                                            |
| ------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `kind`        | enum             | `box`, `text`, `icon`, `ring`. `ring` is an outline drawn outside the parent box (focus indicator).                                                                                                    |
| `children`    | array of strings | Ordered child part names. Child order is layout order. Children **MUST** be declared parts.                                                                                                            |
| `visibleWhen` | condition        | The part is drawn only when the condition holds. Absent means always drawn.                                                                                                                            |
| `placement`   | object           | For a child that is positioned rather than flowed: `anchor` (`top-start`, `top-end`, `bottom-start`, `bottom-end`, `center`) and optional `inset` value. `start`/`end` are logical and flip under RTL. |
| `around`      | string           | For a `ring`: the part it outlines. Defaults to the root.                                                                                                                                              |
| `glyph`       | enum             | For an `icon` nested in a box: the built-in glyph to draw (`checkmark`, `dash`). Unset draws a placeholder.                                                                                            |
| `pressTarget` | string           | For the root: the part the pressed scale applies to (for example a switch handle). Parts nested inside it scale with it (a checkbox `box` scales with its mark). Defaults to the whole scene.          |
| `props`       | object           | Map of **visual property** → value source or conditional list.                                                                                                                                         |

### Visual properties

| Property                                                                                       | Applies to | Meaning                                                                                                                        |
| ---------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `direction`, `align`, `justify`                                                                | box        | Flex-like layout of children.                                                                                                  |
| `gap`                                                                                          | box        | Space between flowed children.                                                                                                 |
| `paddingInlineStart`, `paddingInlineEnd`, `paddingBlockStart`, `paddingBlockEnd`               | box        | Inner padding.                                                                                                                 |
| `height`, `minWidth`, `width`                                                                  | box, icon  | Dimensions. Box width defaults to content.                                                                                     |
| `cornerRadius`                                                                                 | box, ring  | Corner radius.                                                                                                                 |
| `cornerRadiusStartStart`, `cornerRadiusStartEnd`, `cornerRadiusEndStart`, `cornerRadiusEndEnd` | box        | Per-corner radius (block-inline). Each falls back to `cornerRadius`. Renderers draw left-to-right, so start-start is top-left. |
| `fill`, `stroke`, `strokeWidth`, `opacity`                                                     | box, ring  | Paint.                                                                                                                         |
| `color`                                                                                        | text, icon | Content color.                                                                                                                 |
| `trackColor`                                                                                   | progress   | Color of the progress track behind the arc.                                                                                    |
| `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`                                           | text       | Text style.                                                                                                                    |
| `gapToParent`                                                                                  | ring       | Distance between the ring and the parent box.                                                                                  |

**Nested boxes.** A flowed `box` child paints itself (`fill`, `stroke`, `strokeWidth`, `cornerRadius`) and may list its own `children`, which are boxes laid out inside it. A nested child is centered across the parent. Along the inline axis its `justify` prop (`start`, `center`, `end`) places it, with an inset equal to the cross-axis gap. A nested child with no `width` or `height` fills the parent. A `cornerRadius` of `0.5` with `relativeTo: "height"` draws a pill, or a circle for a square box. The switch uses this for its track and handle. A nested `icon` is centered on both axes and draws its `glyph`; the checkbox uses this for its checkmark and dash.

### Value sources

A property value is either one **value source** or an ordered list of **conditional value sources**. A value source is exactly one of:

* `{"value": <literal>}`: a literal. Use only for geometry that no token describes (e.g. a glyph path).
* `{"token": {<name-object fields>}}`: a token selected by name-object fields, resolved with the [cascade](cascade.md).
* `{"relationship": {"property": "...", "context": "..."}}`: a token chosen through the component's [relationships](relationship-format.md). `property` and `context` match the relationship's `scope.property` and `context`.

Selector strings **MAY** contain `{size}` (the request's `size` option value, e.g. `m`) and `{sizeIndex}` (that size's entry in `sizeScale`). A scalar `token` selector value matches an array-valued name field that contains it (e.g. `"state": "disabled"` matches `["disabled"]`).

**NORMATIVE:** A relationship may pin component options in its `scope.options` (a value, or an array of values that match when any listed value matches). For a `relationship` selector the renderer **MUST** keep only the matching relationships whose pinned options all match the request, and **MUST** prefer the ones that pin the most options. A relationship that pins no options is the default: it applies only when no relationship that pins options matches. Keys that are not declared options of the component, and the reserved keys `state`, `scale` and `colorScheme`, are not pinned options. A relationship's `scope.options.state` adds states to those of the token it binds, so a hover color that is a plain palette token can still be selected by state. This lets the component data, not the recipe, say which token applies under which options (for example a badge label is white by default, black for the light variants, and gray for subtle).

**NORMATIVE:** `token` and `relationship` selectors yield a set of candidate tokens. The renderer **MUST** narrow the candidates with the request's mode context (for example `colorScheme`, `scale`) using the [cascade](cascade.md), and **MUST** report a diagnostic if zero or more than one candidate remains.

A conditional entry is a value source plus `when`. A condition has optional `options` (option name → value, or array of values), `states` (state names that must all be active) and `modes` (mode-set name → mode). An array matches when any listed value matches, and counts as one condition.

**NORMATIVE:** When several entries match a request, the renderer **MUST** choose the one with the most conditions (options + states + modes). Ties go to the later entry in document order. An entry without `when` is the default. An entry **MAY** set an integer `priority` (default 0); a higher priority wins before condition count is compared. Use it for states that override every other combination, such as `disabled`.

An entry on `cornerRadius` **MAY** set `relativeTo: "height"`, making its numeric value a ratio of the container height (a pill is `0.5`). A `stroke` on a `box` is drawn inside its bounds, so `strokeWidth` does not change the layout size.

**NORMATIVE:** A renderer **MUST NOT** substitute a literal for a value source it cannot resolve. It **MUST** emit a diagnostic naming the part, property and selector, and omit that property.

### Interim: relationship `context` strings

Relationship `context` is free text today (for example `Background (selected, emphasized)`). Recipes bind to those strings so the pilot can ship without changing relationship data. This is brittle: a reworded context breaks a recipe, and SPEC-062 reports a `relationship` selector that matches no relationship. **RECOMMENDED:** a follow-up adds structured `options` to relationships so recipes can select by option and state instead of by label.

## Validation

The recipe schema checks one file's structure (Layer 1). A JSON Schema cannot read other files, so cross-file checks against component and relationship data are Layer 2 rules. They run only when the recipe catalog is loaded (`design-data validate --visuals-path`) and are skipped when no component catalog is loaded.

| Rule     | Checks                                                                                                                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SPEC-060 | `component` is declared; `parts` keys are anatomy parts; `root` is a top-level anatomy part; `children` appear in the anatomy part's `contains`; `around` and `pressTarget` resolve         |
| SPEC-061 | `when` and `visibleWhen` options exist with allowed values and types; states exist on the component                                                                                         |
| SPEC-062 | `relationship` selectors resolve to a record scoped to the component; `token` selectors match a token (`{size}` and `{sizeIndex}` expand over `sizeScale` first)                            |
| SPEC-063 | `sizeScale` keys equal the component's `size` option values                                                                                                                                 |
| SPEC-066 | Warning. Every option and state the component declares drives the recipe or is listed in `notVisual`; `notVisual` names are declared and unused                                             |
| SPEC-067 | Warning. A `token` selector does not bind a token that one of the component's relationships already binds                                                                                   |
| SPEC-068 | Warning. A literal does not supply a color or a non-zero size (layout keywords, `transparent`, zero and ratio radii are fine)                                                               |
| SPEC-069 | Warning. A `token` or `relationship` selector does not resolve only to deprecated tokens (extends SPEC-058 to recipes)                                                                      |
| SPEC-070 | Warning. Recipes name the focus ring part (`kind: "ring"`) alike                                                                                                                            |
| SPEC-071 | Info. Counts relationship contexts of the component that the recipe never binds                                                                                                             |
| SPEC-075 | Error. A part's `visibleWhen.states` agrees with the `presentIn` of its anatomy part (info when either lists more than one state; see [Anatomy format](anatomy-format.md#presentin))        |
| SPEC-076 | Warning. Runs only with a platform manifest (`validate --platform <id> --visuals-path`). Every binding that resolves on the foundation also resolves once the manifest's cascade is applied |
| SPEC-079 | Warning, planned (not yet enforced). A platform-owned recipe renders over the request grid with no scene diagnostic. Promoted to an error one minor version after it ships                  |
| SPEC-080 | Info, planned (not yet enforced). A platform recipe replaces the foundation recipe of the same component name                                                                               |

SPEC-066 to SPEC-070 are warnings, so `validate` stays green while recipes are migrated. A ratchet keeps the debt from growing: `sdk/core/tests/recipe_lint_baseline.rs` compares each (rule, recipe) warning count with `sdk/core/tests/fixtures/recipe-lint-baseline.json`. A new warning fails the test, an improvement must lower the baseline, and a recipe that is not in the baseline must have none.

## Platform-owned recipes

**PROPOSED, not implemented** (see [Proposal 014](../../../docs/proposals/014-platform-owned-visual-recipes.md)). Nothing loads `extensions/visuals/` yet.

* **Location.** **NORMATIVE (when implemented):** A platform recipe is `extensions/visuals/<component>.json`, one recipe per file, in the platform's extensions directory (honoring `extensionsDir`, see [Manifest](manifest.md#extensions-directory)). The file name **MUST** equal `component`. It validates against the same recipe schema as a foundation recipe, so promoting or demoting it is a file move ([Artifact moves](artifact-moves.md)).
* **Precedence.** A platform recipe **replaces** the foundation recipe of the same component name as a whole file. There is no layering. A foundation recipe stays the default for platforms that have none. A replaced recipe is a copy that can drift; SPEC-080 reports the pair.
* **Resolution.** A recipe's selectors resolve against the platform-merged graph (the manifest's tokens, relationships, components and anatomy). A recipe replaces only the look; anatomy stays neutral, so a recipe may use only the parts the platform-merged component declares (SPEC-060).
* **Validation.** `validate --platform <id>` runs SPEC-060 to SPEC-075 over platform-owned recipes against the platform-merged graph, plus SPEC-079 (every request in the grid renders). SPEC-076 keeps its foundation comparison and covers only foundation recipes the platform did not replace.

## Authoring conventions

These are the conventions the lints above enforce, plus the decisions made while adding the first five recipes. Follow them in a new recipe; a change to an existing recipe that breaks one needs a reason.

1. **Bind through relationships.** A recipe takes a value from the component's relationships by default (SPEC-067). Use a `token` selector only when no relationship covers the value, and a literal only for layout keywords, `transparent`, zero, ratio radii or geometry no token describes (SPEC-068). If the token you need is missing, file the gap; do not hide it behind a literal. Put option-dependent choices in the relationships, not in the recipe: pin `scope.options` on the relationship records (a default with no options, overrides that pin them) and bind the role once, so a variant added later is a data change. **Exception: platform-owned components.** A recipe for a component that a platform manifest declares (for example `button-ios`) MAY bind platform tokens directly with `token` selectors, because the platform's own code binds tokens by name and has no relationship layer. This applies to platform-owned components only; foundation components stay relationship-first. SPEC-062 and, for platform recipes, SPEC-079 keep checking that every selected token resolves. Watch the recipe size: the mapping from option to token then lives in the recipe, so name the platform's tokens so that selectors can template the option values, and measure the recipe's line count (see [Proposal 014](../../../docs/proposals/014-platform-owned-visual-recipes.md)).
2. **Bind current tokens.** Do not bind a deprecated token (SPEC-069; SPEC-058 covers relationships). When the only token is deprecated, bind it and record the gap, so the lint keeps showing it.
3. **Selection is an option, not a state.** Model "selected" as the `isSelected` option and scope relationships with `options.isSelected: true`. The renderer treats `isSelected` as the `selected` state and `isDisabled` as `disabled` when choosing between tokens that carry a state.
4. **Cover the component.** Every option and state the component declares either changes the recipe or is listed in `notVisual` (SPEC-066). `notVisual` records a deliberate absence, for example `isReadOnly` (it only suppresses hover and press) or `icon` until a shared icon registry exists.
5. **Press scales the part the design scales.** Set `pressTarget` to the part the design source scales when pressed: the checkbox scales its `box` (with its mark), the switch scales its `handle`. Parts nested inside the target scale with it, and the label does not.
6. **Priorities.** Disabled overrides interaction states with `priority: 10` (11 where a more specific disabled case must win). Error uses `priority: 5`.
7. **Relationship contexts are the design token group label,** with no `S1` or `S2` prefix, and the same label names the same concept in every component (for example `Control (disabled)`).
8. **Name the focus ring part alike** across recipes (SPEC-070).
9. **Prove a change.** `sdk/core/tests/recipe_snapshots.rs` renders every valid option, state, size, color scheme and scale combination of every recipe and compares a hash per option set with `tests/fixtures/recipe-snapshots.json`. It also fails on any render diagnostic. After a recipe, relationship, token or renderer change, review the option sets it reports with `design-data render`, then regenerate with `UPDATE_RECIPE_SNAPSHOTS=1`. A new recipe is covered automatically.

New recipes **MUST** be free of SPEC-066 to SPEC-070 warnings. Existing recipes are held at their baseline until they are migrated.

## Render request and scene graph

A render request is tool input, not dataset content: `{component, options, states, modes, overlays}`. A **matrix** is a list of requests plus a layout (rows × columns by option or state).

The scene graph is the contract between resolution and output:

* Nodes: `group`, `rect` (with corner radii), `path`, `text`, `ring`.
* Every node carries `part` (anatomy name) and, for each token-bound property, `tokens` (property → token name or uuid and resolved value).
* Measurements (height, padding, gap, radius) are recorded as dimension annotations with their token. Overlay backends draw dimension lines and callouts from these; recipes do not author overlays.

**NORMATIVE:** A backend **MUST** produce the same scene graph input for the same request and dataset version (deterministic output).

### Compiled recipes

A build step **MAY** pre-resolve every `token` and `relationship` binding per `size|colorScheme|scale` into a ranked list of candidates (`{value, token, states}`), so a renderer needs no token graph. Only state-dependent selection remains at render time: take the first candidate whose `states` all apply, else the first. Backends that consume compiled recipes (for example the dependency-free JS runtime emitted by `design-data site`) **MUST** produce the same scene as the Rust reference renderer; the reference renderer is the source of truth and parity is tested.

## Backend and tooling decisions (research outcomes)

These record the research behind this draft and are not normative.

**R1 — Playground (Domino) fit: reference only for now.** Domino models component *instances* (`componentType`, props, `items`/`itemsOrder`, slots). It has no geometry, paint, layout or token-binding concepts, no JSON Schema for the node envelope, and no document-format versioning. Its `0react-spectrum/s2` schemas are generated from React Spectrum, and prop names (`isQuiet`, `isDisabled`, `staticColor`) mostly match ours. The repository is private (`"private": true`; MIT metadata but no LICENSE file), so a public spec must not depend on its schemas. Its Figma plugin maps Figma → Domino, the opposite of our Figma output. Decision: keep recipes independent. A render request can later be converted to or from a Domino instance by an adapter, because option names align. Revisit when Domino publishes a versioned envelope schema.

**R2 — Text measurement: approximate metrics with Source Sans 3.** Adobe Clean is proprietary and cannot be redistributed in this repository. Source Sans 3 (SIL OFL) is the open fallback. Renderers ship a width table for the fallback font and emit SVG `<text>` with the stack `adobe-clean-spectrum-vf, Adobe Clean, Source Sans 3, sans-serif`, so viewers with Adobe Clean available see it. Overlay positions use the measured width and may differ slightly from the viewer's font. SVG output maps font-weight names from tokens (`medium`, `bold`, and so on) to numeric weights. Exact shaping (rustybuzz or similar) is deferred until a licensed-font story exists. Outlining text to paths is **not** used for SVG, since it would require the proprietary font. **RECOMMENDED:** a page that embeds the SVG inline loads Adobe Clean through its own web font (for example the Typekit kit the docs site uses, family `adobe-clean-spectrum-vf`). Standalone `.svg` files, SVG used as an `<img>` or CSS background, and rasterized PNG output cannot load web fonts. They use the installed font or fall back to Source Sans 3, so exports **MAY** look slightly different from the live view. Outlining text at export time with a locally licensed font is a possible later option.

**R3 — Layout: minimal flex first.** The pilot box model needs row direction, centering, gap, padding and one absolutely placed child. A purpose-built layout of that size avoids a dependency and keeps WASM small. Revisit `taffy` when text-field (wrapping, stacked label and help text) is piloted.

**R4 — Icons.** Glyph geometry is sourced as SVG path data keyed by icon name (`workflow-icon`) and by the pilot's fixed glyphs (hold-icon corner triangle, checkmark). Literal paths are the one allowed use of `{"value": ...}`. A shared icon registry is follow-up work.

**R5 — Figma.** The Figma backend consumes the scene graph and emits node JSON for a plugin to create frames bound to Figma Variables by token id, reusing the Variable mapping in `sdk/plugins/figma`. It requires no Figma-specific data in recipes.

## Open questions

* **Structured relationships.** Newer relationships already carry a `part` field and structured `options` (for example `state`, `size`, `scale`). Recipes should prefer them over `context` strings as more components adopt them; action-button's relationships still use labels only.

* **Deprecated tokens.** The pilot's icon sizes bind to `workflow-icon-size-*` tokens that validation (SPEC-058) reports as deprecated in 14.5.0 with no `replacedBy`. The recipe follows the relationships until a replacement is mapped.

* **Switch.** The switch recipe covers default, hover, down, keyboard-focus, and disabled, across selected and emphasized. Its track and handle colors come from relationships added for it, taken from the Figma token spec. They await design sign-off.

* **Pilot coverage.** The action-button recipe covers default, hover, down, focus, disabled, and static black/white. Quiet, selected, and emphasized fills are not yet authored.

* Should render requests (presets, matrices) be stored in the dataset for the Hub site, or stay tool input?

* Which gaps in component-scoped tokens block recipes beyond the pilot? action-button binds only through relationships; many components have none.

* Does `visibleWhen` need boolean composition (any/not), or are single conditions enough?
