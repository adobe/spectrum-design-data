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

| Field         | Type   | Required    | Description                                                                                                                                                                                   |
| ------------- | ------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `specVersion` | string | RECOMMENDED | Spec version label.                                                                                                                                                                           |
| `component`   | string | REQUIRED    | Component `name`.                                                                                                                                                                             |
| `root`        | string | REQUIRED    | Key of the root part in `parts`.                                                                                                                                                              |
| `sizeScale`   | object | OPTIONAL    | Maps each `size` option value to a numeric scale index (e.g. `m` → `100`). Enables `{sizeIndex}` in selectors. A component with no `size` option declares one entry, the size renderers draw. |
| `notVisual`   | array  | OPTIONAL    | Component options and states that deliberately have no visual in this recipe (for example `["isReadOnly"]`). SPEC-066.                                                                        |
| `parts`       | object | REQUIRED    | Map of anatomy part name → part definition.                                                                                                                                                   |

### Part

| Field         | Type             | Description                                                                                                                                                                                            |
| ------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `kind`        | enum             | `box`, `text`, `icon`, `ring`. `ring` is an outline drawn outside the parent box (focus indicator).                                                                                                    |
| `children`    | array of strings | Ordered child part names. Child order is layout order. Children **MUST** be declared parts.                                                                                                            |
| `visibleWhen` | condition        | The part is drawn only when the condition holds. Absent means always drawn.                                                                                                                            |
| `placement`   | object           | For a child that is positioned rather than flowed: `anchor` (`top-start`, `top-end`, `bottom-start`, `bottom-end`, `center`) and optional `inset` value. `start`/`end` are logical and flip under RTL. |
| `around`      | string           | For a `ring`: the part it outlines. Defaults to the root.                                                                                                                                              |
| `icon`        | object           | For an `icon` part (REQUIRED there, not allowed on other kinds): the icon to draw, `{"set": "ui" \| "workflow", "name": "<id>"}`, plus optional `content` and `optional` flags. See [Icons](#icons).   |
| `pressTarget` | string           | For the root: the part the pressed scale applies to (for example a switch handle). Parts nested inside it scale with it (a checkbox `box` scales with its mark). Defaults to the whole scene.          |
| `props`       | object           | Map of **visual property** → value source or conditional list.                                                                                                                                         |

### Visual properties

| Property                                                                                       | Applies to | Meaning                                                                                                                        |
| ---------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `direction`, `align`, `justify`                                                                | box        | Root layout: `direction` `row` (default) or `column`; `align` and `justify` `start`, `center` (default) or `end`.              |
| `gap`                                                                                          | box        | Space between flowed children.                                                                                                 |
| `paddingInlineStart`, `paddingInlineEnd`, `paddingBlockStart`, `paddingBlockEnd`               | box        | Inner padding.                                                                                                                 |
| `height`, `minWidth`, `width`                                                                  | box, icon  | Dimensions. Box width defaults to content.                                                                                     |
| `cornerRadius`                                                                                 | box, ring  | Corner radius.                                                                                                                 |
| `cornerRadiusStartStart`, `cornerRadiusStartEnd`, `cornerRadiusEndStart`, `cornerRadiusEndEnd` | box        | Per-corner radius (block-inline). Each falls back to `cornerRadius`. Renderers draw left-to-right, so start-start is top-left. |
| `fill`, `stroke`, `strokeWidth`, `opacity`                                                     | box, ring  | Paint.                                                                                                                         |
| `color`                                                                                        | text, icon | Content color.                                                                                                                 |
| `trackColor`                                                                                   | progress   | Color of the progress track behind the arc.                                                                                    |
| `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`                                           | text       | Text style. `lineHeight` sets the line box height.                                                                             |
| `gapToParent`                                                                                  | ring       | Distance between the ring and the parent box.                                                                                  |
| `rotation`                                                                                     | icon       | Clockwise rotation in degrees about the icon's center (a `chevron` is 90 when open).                                           |

**Text height.** A `text` part is as high as its line box: a `lineHeight` ending in `px` is that height, a unitless `lineHeight` multiplies `fontSize`, and with no `lineHeight` it is 1.3 times `fontSize`. A bound `fontFamily` leads the SVG font stack, so a family the viewer lacks falls back to the default stack.

**Opacity.** Renderers read `opacity` only on the root part. It dims the whole component as one group (SVG `<g opacity>`), so overlapping parts do not show through each other, the way iOS dims a disabled control. On any other part `opacity` is ignored (SPEC-083).

**Height.** A root `box` with no `height` is 32 high, unless the recipe binds `paddingBlockStart` or `paddingBlockEnd`: then its height is the tallest flowed child plus the block padding, and the children sit between the paddings. An explicit `height` always wins and the block padding then only offsets the children.

**NORMATIVE:** A renderer **MUST** clamp a uniform `cornerRadius` that is larger than half the shorter side of its box to that value, on all four corners, so the corner stays circular (like CSS `border-radius`).

**Row boxes.** A flowed `box` that binds `direction: "row"` lays its `children` out in a row instead of insetting them: `icon`, `text` and `box` children in order, `gap` apart, between its `paddingInlineStart` and `paddingInlineEnd`, centered across (`align` moves them). Without a `width` it is as wide as its children plus padding; without a `height` it is as tall as the tallest child plus its block padding. A `text` child may bind its own padding props, which add to its cell. Only `row` is supported.

**Column stretch.** In a column root, a flowed `box` with no `width` and no row content fills the column's inner width (a divider or a content region). A flowed `box` with no `height` and no children is as tall as its block padding.

**Nested boxes.** A flowed `box` child paints itself (`fill`, `stroke`, `strokeWidth`, `cornerRadius`) and may list its own `children`, which are boxes laid out inside it. A nested child is centered across the parent. Along the inline axis its `justify` prop (`start`, `center`, `end`) places it, with an inset equal to the cross-axis gap. A nested child with no `width` or `height` fills the parent. A `cornerRadius` of `0.5` with `relativeTo: "height"` draws a pill, or a circle for a square box. The switch uses this for its track and handle. A nested `icon` is centered on both axes; the checkbox uses this for its checkmark and dash.

### Icons

An `icon` part names the icon it draws from the dataset's `icons/` catalog ([`icon-set.schema.json`](../schemas/icon-set.schema.json)):

```json
"disclosure-icon": { "kind": "icon", "icon": { "set": "ui", "name": "chevron" }, "props": { ... } }
```

| Field      | Type    | Description                                                                                                                                            |
| ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `set`      | enum    | `ui` (component glyphs such as `chevron`, `checkmark`, `dash`, one drawing per size) or `workflow` (content icons such as `add`, one 20 px drawing).   |
| `name`     | string  | Icon id in that set. SPEC-085 checks it exists.                                                                                                        |
| `content`  | boolean | The icon is content, like a label: the recipe's icon is a default that a render request may replace. Default `false` (the icon is part of the design). |
| `optional` | boolean | With `content`, a render request may also remove the icon. Default `false`.                                                                            |

A `chevron` points to the end; the `rotation` prop turns it (90 when an accordion item is open).

**Content icons.** A render request **MAY** carry `icon`, either `{"set", "name"}` or `"none"`. It applies to every part whose `icon` has `content: true`, the way `label` replaces the text of the recipe's label. `{"set", "name"}` replaces the part's icon. `"none"` removes the part from the layout as if its `visibleWhen` did not hold; it is allowed only on a part with `optional: true`, and on any other part the renderer **MUST** keep the recipe's icon and emit a diagnostic. A request icon that is not in the catalog draws the placeholder with a diagnostic. Parts without `content` ignore the request's `icon`. The button's icon is `content` and `optional` (a label-only button), the badge's is `content` only, because its `icon` option already hides it. Command-line and API spellings of the override (`--icon workflow:edit`, `--icon none`) belong to the tools, not to this format.

**Choosing a drawing.** A `workflow` icon has one drawing, scaled to the part box. A `ui` icon has one drawing per scale index, and the renderer **MUST** choose its scale like this:

1. The token bound to the part's `width` (else `height`) gives it: the token name's `scaleIndex`, else its `size` key (`xs` 50, `s` 75, `m` 100, `l` 200, `xl` 300, `xxl` 400, the scale of `workflow-icon-medium` and its siblings).
2. Otherwise (a literal size, an inline relationship value or a token whose name has neither field), the recipe's `sizeScale` entry for the request's `size`.
3. Otherwise 100.

The drawing at that scale is used; when the icon has none, the renderer **MUST** draw the nearest available scale (the larger one on a tie). SPEC-086 warns when a recipe falls back, since another size's drawing has different stroke weights and proportions. The scale is chosen once per size and mode, from the bindings the part has with no states and default options, so a state or option never changes the drawing. A renderer **MAY** make this choice when it compiles the recipe.

**Drawing.** The renderer scales the icon's `viewBox` uniformly to fit the part box, centered, applies `rotation` about the box center, and fills every path, honoring its `fillRule`, with the part's resolved `color`. Icon data carries no color. A part box that is not square leaves the icon at the smaller side, so an icon part's `width` and `height` are the icon's size, not the size of the shape it draws.

An icon with no drawing (no such set or icon in the catalog, or no catalog) **MUST** draw a placeholder plus in the part box and emit a diagnostic naming the set, the icon and the request's size.

### Value sources

A property value is either one **value source** or an ordered list of **conditional value sources**. A value source is exactly one of:

* `{"value": <literal>}`: a literal. Use only for geometry that no token describes (e.g. a glyph path).
* `{"token": {<name-object fields>}}`: a token selected by name-object fields, resolved with the [cascade](cascade.md).
* `{"relationship": {"property": "...", "context": "..."}}`: a token chosen through the component's [relationships](relationship-format.md). `property` and `context` match the relationship's `scope.property` and `context`.

Selector strings **MAY** contain `{size}` (the request's `size` option value, e.g. `m`), `{sizeIndex}` (that size's entry in `sizeScale`) and `{<option>}` for any other option the component declares (for example `{style}`). A `{<option>}` placeholder expands to each value the option declares, and a candidate found for one value applies only when the request's option equals that value, so one selector serves every value. A brace pair whose content is not a plain identifier (letters and digits) is literal text. A scalar `token` selector value matches an array-valued name field that contains it (e.g. `"state": "disabled"` matches `["disabled"]`).

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

| Rule     | Checks                                                                                                                                                                                                       |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SPEC-060 | `component` is declared; `parts` keys are anatomy parts; `root` is a top-level anatomy part; `children` appear in the anatomy part's `contains`; `around` and `pressTarget` resolve                          |
| SPEC-061 | `when` and `visibleWhen` options exist with allowed values and types; states exist on the component; a `{<option>}` placeholder in a selector names a declared option that lists its values                  |
| SPEC-062 | `relationship` selectors resolve to a record scoped to the component; `token` selectors match a token (`{size}` and `{sizeIndex}` expand over `sizeScale`, and `{<option>}` over the option's values, first) |
| SPEC-063 | `sizeScale` keys equal the component's `size` option values (one entry when it has none)                                                                                                                     |
| SPEC-066 | Warning. Every option and state the component declares drives the recipe or is listed in `notVisual`; `notVisual` names are declared and unused                                                              |
| SPEC-067 | Warning. A `token` selector does not bind a token that one of the component's relationships already binds                                                                                                    |
| SPEC-068 | Warning. A literal does not supply a color or a non-zero size (layout keywords, `transparent`, zero and ratio radii are fine)                                                                                |
| SPEC-069 | Warning. A `token` or `relationship` selector does not resolve only to deprecated tokens (extends SPEC-058 to recipes)                                                                                       |
| SPEC-070 | Warning. Recipes name the focus ring part (`kind: "ring"`) alike                                                                                                                                             |
| SPEC-071 | Info. Counts relationship contexts of the component that the recipe never binds                                                                                                                              |
| SPEC-075 | Error. A part's `visibleWhen.states` agrees with the `presentIn` of its anatomy part (info when either lists more than one state; see [Anatomy format](anatomy-format.md#presentin))                         |
| SPEC-076 | Warning. Runs only with a platform manifest (`validate --platform <id> --visuals-path`). Every binding that resolves on the foundation also resolves once the manifest's cascade is applied                  |
| SPEC-079 | Warning. A platform-owned recipe renders over the request grid with no scene diagnostic. Planned to become an error in a later minor release                                                                 |
| SPEC-080 | Info. A platform recipe replaces the foundation recipe of the same component name                                                                                                                            |
| SPEC-083 | Warning. A part binds only props the renderer reads for it (the root, its `kind`, or a `placement`); the schema accepts more, and the renderer ignores the rest                                              |
| SPEC-085 | Error. An `icon` part's `set` and `name` exist in the `icons/` catalog. Runs when the catalog is loaded (`--icons-path`, or the probed `packages/design-data/icons`)                                         |
| SPEC-086 | Warning. Over the request grid, every `ui` icon has a drawing at the scale its size binding gives (see [Icons](#icons)), so the renderer does not fall back to the nearest size                              |

SPEC-066 to SPEC-070 are warnings, so `validate` stays green while recipes are migrated. A ratchet keeps the debt from growing: `sdk/core/tests/recipe_lint_baseline.rs` compares each (rule, recipe) warning count with `sdk/core/tests/fixtures/recipe-lint-baseline.json`. A new warning fails the test, an improvement must lower the baseline, and a recipe that is not in the baseline must have none.

## Platform-owned recipes

Implemented for `render`, `site` and the Rust core (see [Proposal 014](../../../docs/proposals/014-platform-owned-visual-recipes.md)). `render` and `site` load the foundation recipes into the graph, then apply the platform's `extensions/visuals/` over them, and look recipes up through `componentAliases`.

* **Location.** **NORMATIVE (when implemented):** A platform recipe is `extensions/visuals/<component>.json`, one recipe per file, in the platform's extensions directory (honoring `extensionsDir`, see [Manifest](manifest.md#extensions-directory)). The file name **MUST** equal `component`. It validates against the same recipe schema as a foundation recipe, so promoting or demoting it is a file move ([Artifact moves](artifact-moves.md)).
* **Precedence.** A platform recipe **replaces** the foundation recipe of the same component name as a whole file. There is no layering. A foundation recipe stays the default for platforms that have none. A replaced recipe is a copy that can drift; SPEC-080 reports the pair.
* **Resolution.** A recipe's selectors resolve against the platform-merged graph (the manifest's tokens, relationships, components and anatomy). A recipe replaces only the look; anatomy stays neutral, so a recipe may use only the parts the platform-merged component declares (SPEC-060).
* **Validation.** `validate --platform <id>` runs SPEC-060 to SPEC-075 and SPEC-083 over platform-owned recipes against the platform-merged graph, plus SPEC-079 (every request in the grid renders). SPEC-076 keeps its foundation comparison and covers only foundation recipes the platform did not replace.

## Authoring conventions

These are the conventions the lints above enforce, plus the decisions made while adding the first five recipes. Follow them in a new recipe; a change to an existing recipe that breaks one needs a reason.

1. **Bind through relationships.** A recipe takes a value from the component's relationships by default (SPEC-067). Use a `token` selector only when no relationship covers the value, and a literal only for layout keywords, `transparent`, zero, ratio radii or geometry no token describes (SPEC-068). If the token you need is missing, file the gap; do not hide it behind a literal. Put option-dependent choices in the relationships, not in the recipe: pin `scope.options` on the relationship records (a default with no options, overrides that pin them) and bind the role once, so a variant added later is a data change. **Exception: platform-owned components.** A recipe for a component that a platform manifest declares (for example `button-ios`) MAY bind platform tokens directly with `token` selectors, because the platform's own code binds tokens by name and has no relationship layer. This applies to platform-owned components only; foundation components stay relationship-first. SPEC-062 and, for platform recipes, SPEC-079 keep checking that every selected token resolves. Watch the recipe size: the mapping from option to token then lives in the recipe, so name the platform's tokens so that selectors can template the option values, and measure the recipe's line count (see [Proposal 014](../../../docs/proposals/014-platform-owned-visual-recipes.md)).
2. **Bind current tokens.** Do not bind a deprecated token (SPEC-069; SPEC-058 covers relationships). When the only token is deprecated, bind it and record the gap, so the lint keeps showing it.
3. **Selection is an option, not a state.** Model "selected" as the `isSelected` option and scope relationships with `options.isSelected: true`. The renderer treats `isSelected` as the `selected` state and `isDisabled` as `disabled` when choosing between tokens that carry a state.
4. **Cover the component.** Every option and state the component declares either changes the recipe or is listed in `notVisual` (SPEC-066). `notVisual` records a deliberate absence, for example `isReadOnly` (it only suppresses hover and press), or the button's `icon` option, which names a workflow icon but does not yet choose the content icon a request draws (p6ga.17.4 decides how the two relate).
5. **Press scales the part the design scales.** Set `pressTarget` to the part the design source scales when pressed: the checkbox scales its `box` (with its mark), the switch scales its `handle`. Parts nested inside the target scale with it, and the label does not.
6. **Priorities.** Disabled overrides interaction states with `priority: 10` (11 where a more specific disabled case must win). Error uses `priority: 5`.
7. **Relationship contexts are the design token group label,** with no `S1` or `S2` prefix, and the same label names the same concept in every component (for example `Control (disabled)`).
8. **Name the focus ring part alike** across recipes (SPEC-070).
9. **Prove a change.** `sdk/core/tests/recipe_snapshots.rs` renders every valid option, state, size, color scheme and scale combination of every recipe and compares a hash per option set with `tests/fixtures/recipe-snapshots.json`. It also fails on any render diagnostic. After a recipe, relationship, token or renderer change, review the option sets it reports with `design-data render`, then regenerate with `UPDATE_RECIPE_SNAPSHOTS=1`. A new recipe is covered automatically.

New recipes **MUST** be free of SPEC-066 to SPEC-070 warnings. Existing recipes are held at their baseline until they are migrated.

## Render request and scene graph

A render request is tool input, not dataset content: `{component, options, states, modes, label, icon, overlays}`. `label` replaces the label text and `icon` the content icon (see [Icons](#icons)). A **matrix** is a list of requests plus a layout (rows × columns by option or state).

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

**R2 — Text measurement: approximate metrics with Source Sans 3.** Adobe Clean is proprietary and cannot be redistributed in this repository. Source Sans 3 (SIL OFL) is the open fallback. Renderers ship a width table for the fallback font and emit SVG `<text>` with the stack `adobe-clean-spectrum-vf, Adobe Clean, 'Source Sans 3', sans-serif`, so viewers with Adobe Clean available see it. A family name that is not a valid CSS identifier sequence (`Source Sans 3`: a word starting with a digit) **MUST** be quoted, because one unquoted invalid name makes the browser drop the whole `font-family` list and render serif; a family bound by a recipe is emitted quoted and ahead of this stack. Overlay positions use the measured width and may differ slightly from the viewer's font. SVG output maps font-weight names from tokens (`medium`, `bold`, and so on) to numeric weights. Exact shaping (rustybuzz or similar) is deferred until a licensed-font story exists. Outlining text to paths is **not** used for SVG, since it would require the proprietary font. **RECOMMENDED:** a page that embeds the SVG inline loads Adobe Clean through its own web font (for example the Typekit kit the docs site uses, family `adobe-clean-spectrum-vf`). Standalone `.svg` files, SVG used as an `<img>` or CSS background, and rasterized PNG output cannot load web fonts. They use the installed font or fall back to Source Sans 3, so exports **MAY** look slightly different from the live view. Outlining text at export time with a locally licensed font is a possible later option.

**R3 — Layout: minimal flex first.** The pilot box model needs row direction, centering, gap, padding and one absolutely placed child. A purpose-built layout of that size avoids a dependency and keeps WASM small. Revisit `taffy` when text-field (wrapping, stacked label and help text) is piloted.

**R4 — Icons.** Icon geometry is SVG path data in the dataset's `icons/` catalog, imported from React Spectrum S2 (UI icons at every size, a few workflow icons). Recipes reference it by set and name ([Icons](#icons)); they hold no path data.

**R5 — Figma.** The Figma backend consumes the scene graph and emits node JSON for a plugin to create frames bound to Figma Variables by token id, reusing the Variable mapping in `sdk/plugins/figma`. It requires no Figma-specific data in recipes.

## Open questions

* **Structured relationships.** Newer relationships already carry a `part` field and structured `options` (for example `state`, `size`, `scale`). Recipes should prefer them over `context` strings as more components adopt them; action-button's relationships still use labels only.

* **Deprecated tokens.** The pilot's icon sizes bind to `workflow-icon-size-*` tokens that validation (SPEC-058) reports as deprecated in 14.5.0 with no `replacedBy`. The recipe follows the relationships until a replacement is mapped.

* **Switch.** The switch recipe covers default, hover, down, keyboard-focus, and disabled, across selected and emphasized. Its track and handle colors come from relationships added for it, taken from the Figma token spec. They await design sign-off.

* **Pilot coverage.** The action-button recipe covers default, hover, down, focus, disabled, and static black/white. Quiet, selected, and emphasized fills are not yet authored.

* Should render requests (presets, matrices) be stored in the dataset for the Hub site, or stay tool input?

* Which gaps in component-scoped tokens block recipes beyond the pilot? action-button binds only through relationships; many components have none.

* Does `visibleWhen` need boolean composition (any/not), or are single conditions enough?
