# @adobe/design-data-spec

## 4.16.0

### Minor Changes

- [#1708](https://github.com/adobe/spectrum-design-data/pull/1708) [`2e6bc57`](https://github.com/adobe/spectrum-design-data/commit/2e6bc5767d35ad32418b800f98b2162733eda879) Thanks [@GarthDB](https://github.com/GarthDB)! - State model: combined interaction states now resolve per property, with
  `keyboard-focus` as a non-layered state between `hover` (50) and `down` (70), so
  pressed beats focus beats hover. `prop` states pick the token set and a token
  that matches more active states wins before precedence is compared.
  `layered` is deprecated: schemas still accept it and resolvers ignore it. The
  state registry now carries default precedence (hover 50, focus and
  keyboard-focus 60, down and active 70), so components declare precedence only
  to deviate. The renderer does not read precedence yet (follow-up work).

  Button no longer declares explicit precedence or `layered`; it uses the registry defaults.

### Patch Changes

- [#1704](https://github.com/adobe/spectrum-design-data/pull/1704) [`f7cf8f0`](https://github.com/adobe/spectrum-design-data/commit/f7cf8f02df71ee69d116cbd1b929305ea5eb03c7) Thanks [@GarthDB](https://github.com/GarthDB)! - Button: the `variant` default is now `primary`, matching Figma, React Spectrum S2
  and SWC Gen2 (it was `accent`). The visual recipe binds
  "Minimum height" as `minHeight`, the label sets `overflow: wrap`, and the root
  `minWidth` reads the `minimum-width-multiplier` token (2.25 times the height) when
  a label shows. The `focus` state is renamed `keyboard-focus`, as in the other recipes and in the
  relationship scopes, and the focus fill now takes the hover look (the key-focus
  tokens for accent, negative and primary, gray-200 for secondary), as React
  Spectrum S2 and SWC Gen2 do.
  The renderer reads `relativeTo: "height"` on a root `minWidth`.

## 4.15.0

### Minor Changes

- [#1703](https://github.com/adobe/spectrum-design-data/pull/1703) [`5f38c0a`](https://github.com/adobe/spectrum-design-data/commit/5f38c0a00507a59c5c575dfd8efedf9ca9d92251) Thanks [@GarthDB](https://github.com/GarthDB)! - Component visuals: a part of kind `component` draws another component's recipe
  inside the host (nested recipes).

  The part names the `component`, a `sizeMap` from each host size to a nested size,
  and `with` options that are literals or `{"option": name}` read from the host's
  request. The nested recipe is solved on its own and its nodes join the scene: the
  root node keeps the host part id and the others are `<part>.<inner>`, so anatomy
  views and spec-sheet markers still see one part. Host states do not reach it.
  A row box can group `component` parts and drops out when none is visible. Nesting
  is limited to two levels and may not cycle. New rule SPEC-089
  (`visual-nested-component-valid`); `component-visual.schema.json` accepts the new
  kind and its `component`, `sizeMap` and `with` fields. Compiled recipes gain
  `nested` and `nestedSize` on `component` parts only.

- [#1700](https://github.com/adobe/spectrum-design-data/pull/1700) [`2a6ccd3`](https://github.com/adobe/spectrum-design-data/commit/2a6ccd3796290fa0e4de081072d8d28556524ce7) Thanks [@GarthDB](https://github.com/GarthDB)! - Component visuals: a root can bind `width` and `minWidth`, and a part can
  `grow` to fill the rest of a row.

  The root's outer width is `max(minWidth, width)`, padding inside it; a root
  with neither still hugs its content. `grow` (`true` or a positive share) on a
  `box` or `text` in a row splits the space left after the other parts, gaps and
  padding. A render request gains an optional `width` (px), the demo width, which
  overrides the recipe's `width` but not its `minWidth`. A fixed width narrower
  than the content overflows without clipping and adds a scene diagnostic.
  `component-visual.schema.json` accepts `grow`. A flowed row box with no `width`
  now fills a column root. SPEC-083's fixture uses `rotation` on a box, since
  `minWidth` is now read.

- [#1701](https://github.com/adobe/spectrum-design-data/pull/1701) [`6ee52bc`](https://github.com/adobe/spectrum-design-data/commit/6ee52bc9f0e03eca4bbb063a175171b6f4e886a1) Thanks [@GarthDB](https://github.com/GarthDB)! - Component visuals: a `text` part can wrap or truncate its label, and a root can
  bind `minHeight`.

  A text part that is a direct child of the root binds `overflow` (`wrap` or
  `truncate`, after React Spectrum's `overflowMode`). With a fixed width (a request
  `width` or a root `width`) it breaks greedily after spaces and hyphens against
  the width the root leaves it, measured with the text table; without one, or
  without `overflow`, it hugs on one line as before. A word wider than the width
  is never split: it overflows and adds a scene diagnostic. A wrapped label is one
  scene text node per line. `minHeight` makes the root a minimum: a row root with
  no block padding pads by `(minHeight - one line) / 2` and grows by a line height
  per extra line. `component-visual.schema.json` accepts `minHeight` and
  `overflow`.

- [#1692](https://github.com/adobe/spectrum-design-data/pull/1692) [`cc4a279`](https://github.com/adobe/spectrum-design-data/commit/cc4a279782ea922938fdf8f6f43706a341f60447) Thanks [@GarthDB](https://github.com/GarthDB)! - Add an optional `render.svg` string to the component spec-sheet schema.

  `design-data spec-sheet --svg` writes each block's visual as SVG (the same
  renderer as `design-data render`) next to its scene, so a view can draw the
  visual without a renderer of its own. Sheets written without `--svg` are
  unchanged.

### Patch Changes

- [#1698](https://github.com/adobe/spectrum-design-data/pull/1698) [`9590728`](https://github.com/adobe/spectrum-design-data/commit/95907289353fb320b85b66d7602ea8b19d591e2d) Thanks [@GarthDB](https://github.com/GarthDB)! - Component visuals: layout and text measurement now exist once, in Rust.
  The spec no longer describes a JavaScript runtime that mirrors the
  reference renderer. Browsers load the same solver as WASM and only draw
  the scene.

## 4.14.1

### Patch Changes

- [#1690](https://github.com/adobe/spectrum-design-data/pull/1690) [`c33212a`](https://github.com/adobe/spectrum-design-data/commit/c33212a8996e883625598123e95fec48ed7cd319) Thanks [@GarthDB](https://github.com/GarthDB)! - Compiled recipes describe `iconChoices` for content icons.

  A compiled recipe no longer depends on the request `icon`. Each content icon part lists the
  drawing key of every catalog icon in `iconChoices`, so a renderer with one precompiled variant
  and no catalog can apply the request icon. Existing `drawing`, `drawingMiss` and `drawings`
  fields are unchanged.

## 4.14.0

### Minor Changes

- [#1678](https://github.com/adobe/spectrum-design-data/pull/1678) [`c223628`](https://github.com/adobe/spectrum-design-data/commit/c2236288e5cfa47bfe9f4099abb24d03f7c10acf) Thanks [@GarthDB](https://github.com/GarthDB)! - Add SPEC-088 (relationship-duplicate-record), a warning for exact duplicate relationship records.

  Two records in the same file with equal scope, context and `$ref` or value are reported, so
  `Dataset.validate()` in the WASM package can now return it. Spec sheets also resolve a `$ref`
  that names a mode-set group (`setUuid`), showing one value per member scale instead of
  skipping the record.

## 4.13.0

### Minor Changes

- [#1667](https://github.com/adobe/spectrum-design-data/pull/1667) [`160dcb0`](https://github.com/adobe/spectrum-design-data/commit/160dcb099128afc1574ec9c7fdab5df28526eb53) Thanks [@GarthDB](https://github.com/GarthDB)! - Recipe icon parts reference icons from the `icons/` catalog instead of the `glyph` enum.
  - **spec**: `"icon": {"set": "ui" | "workflow", "name": "<id>"}` is required on every `icon` part,
    and `glyph` is removed from the draft recipe schema with no alias. `content` and `optional` mark
    an icon a render request may replace or remove. `component-visuals.md` adds an Icons section that
    defines how a drawing is chosen from the size token (`scaleIndex`, else `size` key, else
    `sizeScale`, nearest scale on a miss). New rules: SPEC-085 (error, the icon exists) and SPEC-086
    (warning, a UI icon has a drawing at its scale). `icons/` joins the dataset discovery list.
  - **design-data**: accordion and checkbox reference `ui` chevron, checkmark and dash. Button,
    badge and action-button icons default to `workflow:add`, and the action-button hold icon is
    `ui:corner-triangle`.
  - **wasm**: scene icon nodes carry `icon` (`set`, `name`) instead of `glyph`. Drawings are
    unchanged.

- [#1668](https://github.com/adobe/spectrum-design-data/pull/1668) [`4887473`](https://github.com/adobe/spectrum-design-data/commit/4887473689907243213225da695cc7944f9f0dfc) Thanks [@GarthDB](https://github.com/GarthDB)! - Renderers draw the real Spectrum 2 icon paths from the `icons/` catalog.
  - **wasm**: `renderScene`/`renderSvg` draw each icon part's catalog drawing, fitted to the part
    box, rotated about its center and filled with the part colour. Scene icon nodes carry
    `icon.drawing` (`viewBox`, `paths`). An icon with no drawing draws a placeholder plus and adds
    a diagnostic. Buttons, badges and action buttons now show `workflow:add`, the hold icon the
    corner triangle, and the accordion chevron and checkbox marks the S2 UI paths.
  - **spec**: the drawing is chosen once per size and mode, a non-square part box leaves the icon
    at its smaller side, and a missing drawing must draw a placeholder with a diagnostic.
  - **design-data**: the checkbox dash part box is the icon size (8/10/10/12, like the
    checkmark) instead of the bar size, so the S2 dash drawing fits it.

- [#1661](https://github.com/adobe/spectrum-design-data/pull/1661) [`6080645`](https://github.com/adobe/spectrum-design-data/commit/608064534fc01696964d3dae7f09d61bd7dac29e) Thanks [@GarthDB](https://github.com/GarthDB)! - Add an `icons/` catalog with Spectrum 2 icon path data from React Spectrum.
  - `icons/ui.json` holds the 11 S2 UI icons with every size drawing (for example
    `chevron` at 50, 75, 100, 200, 300 and 400). `icons/workflow.json` holds five demo
    workflow icons: add, edit, delete, settings and search.
  - Paths carry no colour. Each set records the source commit, file names, licence
    (Apache-2.0) and copyright.
  - The spec adds `icon-set.schema.json` and registers `icons/` as an optional dataset
    directory, so `validate-dataset` checks it.
  - The WASM package embeds both sets in its dataset (about 38 KB raw, 12 KB gzip).
    Recipes do not use them yet.

- [#1673](https://github.com/adobe/spectrum-design-data/pull/1673) [`dd30d97`](https://github.com/adobe/spectrum-design-data/commit/dd30d97159cb02c9efe6cdd916c2faf5795fb9c1) Thanks [@GarthDB](https://github.com/GarthDB)! - Visual recipes can declare a relationship context as derived instead of bound.

  The recipe schema gains a `derived` array (`context`, `property`, `part`, optional `edge`, and
  `from`). The only formula is `(height - <part>.lineHeight) / 2` (or `.height`). New rule SPEC-087
  warns when the token of a derived context disagrees with its formula for any size and scale, so
  `Dataset.validate()` in the WASM package now reports those warnings. The spec sheet schema gains
  `derived` on markers and measurements.

## 4.12.1

### Patch Changes

- [#1650](https://github.com/adobe/spectrum-design-data/pull/1650) [`25df278`](https://github.com/adobe/spectrum-design-data/commit/25df2787641f42fbc3f845c09d36645e7846b1ac) Thanks [@GarthDB](https://github.com/GarthDB)! - Renderer SVG text uses a valid CSS `font-family` list.
  - The default stack quotes `'Source Sans 3'`. The unquoted name made browsers drop the
    whole list and render serif.
  - A family bound by a recipe token (such as `Adobe Clean Spectrum VF`) is quoted unless it
    is a generic keyword. The Rust renderer and the JS runtime produce the same list.
  - Spec R2 shows the quoted stack and requires quoting for names that are not CSS
    identifiers.

## 4.12.0

### Minor Changes

- [#1647](https://github.com/adobe/spectrum-design-data/pull/1647) [`37dbdb6`](https://github.com/adobe/spectrum-design-data/commit/37dbdb6d3676295c36e1d979fb66392119a7671f) Thanks [@GarthDB](https://github.com/GarthDB)! - Spec sheet markers say whether the visual draws them.
  - Each `render.markers[]` entry has a required `drawn` boolean. An undrawn marker keeps
    its number on the rows.
  - A measurement's `label` is the bound token's name, the name the token rows show.
  - A marker's `label` is its group's relationship property without the size part, so groups
    with identical rows are told apart.

## 4.11.1

### Patch Changes

- [#1644](https://github.com/adobe/spectrum-design-data/pull/1644) [`13f4851`](https://github.com/adobe/spectrum-design-data/commit/13f4851adab6c4e01ef3299cafb8c156bcfdfa19) Thanks [@GarthDB](https://github.com/GarthDB)! - Stop the component changelog from reading re-scoped records as removals.
  - Relationship records that match on component, property, context and target pair
    as an update when `scope.options` differ.
  - A context rename on the same target is a documentation update. Trailing
    whitespace in a context is not a change.
  - Removing a relationship whose exact twin survives is metadata, not major.
  - Changelogs are regenerated: button and accordion leave 2.0.0 (1.2.0), combo-box
    and text-area leave 2.0.0 (1.1.2).

## 4.11.0

### Minor Changes

- [#1630](https://github.com/adobe/spectrum-design-data/pull/1630) [`9e9a6fa`](https://github.com/adobe/spectrum-design-data/commit/9e9a6fa618b8e65a3d6ba19d83e9e6f00ec6ec46) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(sdk): changelog attributes tokens a component reaches through tokenBindings (hzje.31)
  - **design-data changelog**: a token change reaches a component that names the token in
    `tokenBindings` (resolved by token name to every token uuid with that name), not only through
    relationships. Such entries carry `reachedBy: "tokenBinding"`; a token reached both ways is
    attributed once, unmarked.
  - **component-changelog.schema.json**: entries gain an optional `reachedBy`.

- [#1628](https://github.com/adobe/spectrum-design-data/pull/1628) [`b0fcd0a`](https://github.com/adobe/spectrum-design-data/commit/b0fcd0a4bfb3c1c7dd28290436413db866131379) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(sdk): scene measurements for nested parts, border, focus ring and press ratio (qkj5.93)
  - **core::visual**: the scene adds `width`, `height`, `radius` and `padding` measurements for
    nested parts, `border` for stroke widths, `focus-thickness` and `focus-gap` for the ring, and
    `press` for the press ratio. Each carries its token and relationship. Existing measurements
    and the SVG output are unchanged.
  - **design-data spec-sheet**: Layout blocks render in the states and options their bindings need
    (a focus ring in `keyboard-focus`, a pressed scale in `down`), so the scene shows the part
    the block documents. Measurements show on the Layout page only.
  - **component-spec-sheet.schema.json**: the `measurements` description lists the new kinds.

- [#1627](https://github.com/adobe/spectrum-design-data/pull/1627) [`1b331ec`](https://github.com/adobe/spectrum-design-data/commit/1b331ecf575ea170fbec2b402d5835c2822de939) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(sdk): spec sheets show relationship records that have no context (qkj5.106, qkj5.107)
  - **design-data spec-sheet**: records without a `context` form one block per relationship
    property, titled from the property and marked `titleSource: "property"`. Inline-value
    records are rows with `source: "inline"`, the value and no token. Every component with
    relationships now has at least one block.
  - **design-data spec-sheet**: scales of one token merge into a row; color schemes (`light`,
    `dark`, `wireframe`) get their own value key, so they no longer overwrite each other.
  - **component-spec-sheet.schema.json**: blocks gain required `titleSource` and `records`;
    items gain required `source`. Regenerate any sheet made before this change.

### Patch Changes

- [#1629](https://github.com/adobe/spectrum-design-data/pull/1629) [`435d06b`](https://github.com/adobe/spectrum-design-data/commit/435d06b705453297fbf0cb7337e3b1781c36f9a2) Thanks [@GarthDB](https://github.com/GarthDB)! - fix(sdk): spec sheet token names come from the token's structured name (qkj5.105, qkj5.85)
  - **design-data spec-sheet**: the token column shows the name the SDK serializes from the
    token's structured name (or its pinned `legacyKey`), not the relationship property. A focus
    ring thickness reads `focus-indicator-thickness`, a switch track width
    `switch-control-width-small`. Rows that use one token for two relationship properties stay
    separate rows.

## 4.10.0

### Minor Changes

- [#1621](https://github.com/adobe/spectrum-design-data/pull/1621) [`1ce36f6`](https://github.com/adobe/spectrum-design-data/commit/1ce36f66d777cd699034a2b87842a97e17315565) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(sdk): spec sheets for every component with relationships (`design-data spec-sheet --all`)

  `design-data spec-sheet --all -o <dir> [--changelog-dir <dir>]` writes one sheet per component
  with relationships plus `index.json` (visual flag, page and block counts, version and latest
  release). A component with a visual recipe gets a full sheet; any other gets a table-only
  sheet: `visual: false`, blocks with token rows and `render: null`, so views can say "No visual
  recipe yet". The same stub is the starting point for a new component.
  `component-spec-sheet.schema.json` gains a required `visual` and a nullable block `render`;
  regenerate any sheet made before this change.

  Line-height and font-family relationships now sit on the Typography page, not Layout.

## 4.9.0

### Minor Changes

- [#1604](https://github.com/adobe/spectrum-design-data/pull/1604) [`21c4d24`](https://github.com/adobe/spectrum-design-data/commit/21c4d240453333a8830c68a2e0afc4b18e9403b0) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(design-data): accordion item visual recipe and row boxes in the renderer

  Adds the accordion item recipe (sizes s to xl, density, quiet, open, hover, disabled).
  It needs three renderer features, in both the Rust solver and the JS runtime:
  - A flowed box that binds `direction: "row"` lays out icon, text and box children in a row.
  - A column root stretches a box with no width across its width.
  - An icon can bind `rotation`, and the `chevron` glyph is new.

  A relationship that pins `size`, or binds a single token, no longer loses that token to the
  token's own size name. A templated numeric selector field (`{sizeIndex}`) now matches a number.

- [#1582](https://github.com/adobe/spectrum-design-data/pull/1582) [`9b4ad35`](https://github.com/adobe/spectrum-design-data/commit/9b4ad35c29fb00193e5847625699afb04fa0c560) Thanks [@GarthDB](https://github.com/GarthDB)! - Define what an anatomy part is; review button, action-button and badge
  (`flowed-box-paints`: checkbox, switch).

  **Spec:**
  - `anatomy-format.md` says what counts as a part, how to name and nest parts, when a part
    is required, and what is not anatomy. It adds a review checklist.
  - New optional `presentIn` lists the states a part is present in. Not allowed on a required part.
  - New optional `anatomyReview` on a component records `draft` or `reviewed`.
  - New info rule SPEC-073 lists components with relationships but no anatomy, or draft anatomy.
  - New error SPEC-074: a part's `presentIn` states must be declared on the component.
  - New error SPEC-075: a recipe's `visibleWhen.states` must agree with the part's `presentIn`.

  **Data:**
  - Button, action-button and badge anatomy are reviewed.
  - Button `label` is now optional. The focus indicator is state-only on all four.

  **WASM:** the validator includes SPEC-073 to SPEC-075.

- [#1582](https://github.com/adobe/spectrum-design-data/pull/1582) [`9b4ad35`](https://github.com/adobe/spectrum-design-data/commit/9b4ad35c29fb00193e5847625699afb04fa0c560) Thanks [@GarthDB](https://github.com/GarthDB)! - Add the artifact-moves chapter: promoting and demoting one artifact between a platform
  and the foundation.
  - **spec/artifact-moves.md**: what can move, who decides, promotion criteria, the six steps,
    the demotion notice period (same as deprecation), and proposed `lifecycle.moves` provenance.
  - **Proposed, not implemented**: rule SPEC-077 `artifact-single-owner` for half-finished moves.
  - **spec/index.md, spec/manifest.md**: link to the new chapter.

- [#1582](https://github.com/adobe/spectrum-design-data/pull/1582) [`9b4ad35`](https://github.com/adobe/spectrum-design-data/commit/9b4ad35c29fb00193e5847625699afb04fa0c560) Thanks [@GarthDB](https://github.com/GarthDB)! - Recipe lints and fixes for checkbox, switch and others; pressed scale includes nested parts.
  - **relationships**: strip the stray "S2 " prefix from contexts; add checkbox `Control`,
    disabled and error contexts; scope selected switch and radio-button records with
    `isSelected: true` (the schema allows boolean option values, the renderer maps them).
  - **visuals**: pressed parts scale nested children; checkbox `pressTarget`; `notVisual` option list.
  - **validate**: SPEC-066 to SPEC-070 warn on uncovered options and states, token selectors a
    relationship covers, literals, deprecated tokens and focus ring names; SPEC-071 is info.
    `recipe_lint_baseline` holds each recipe at its current warning count.
  - **spec**: authoring conventions in `component-visuals.md`; `notVisual` recipe field.
  - **sdk/core**: render snapshot test for every recipe; `SceneCache` speeds matrix renders.
  - **relationships**: `scope.options` pick a default or the most specific override (arrays allowed);
    badge colors, padding and fonts bind that way, shrinking its recipe by 1,600 lines.
    `scope.options.state` adds states to the bound token.
  - **switch**: `isReadOnly` has no distinct visual (hover and press only).
  - **button, action-button**: colors, press perspective, hold-icon inset bind via relationships.
  - **focus-indicator**: the `focus-ring` anatomy, gap token and recipe parts are now
    `focus-indicator` (legacy key `focus-ring-gap` kept).

- [#1616](https://github.com/adobe/spectrum-design-data/pull/1616) [`19318d9`](https://github.com/adobe/spectrum-design-data/commit/19318d96723c39526f9f909fa44734f1e49874d6) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(core): component changelog entries, classes and derived semver (hzje.4-6)

  New `component-changelog.schema.json` and `spec/component-changelog.md` define
  `changelog/<component>.json`: releases (append only) of entries, each with the component,
  relationship context, class (`visual`, `api`, `documentation`, `metadata`), bump, direct or
  indirect, field changes, `rationale` where the record has one, and its source (the PR from the
  squash subject, otherwise the commit). `core::changelog` builds the entries from a record diff
  and derives the component semver from them: major for a removed option, option value, state,
  anatomy part, slot or relationship, a renamed option, or a deprecated component; minor for
  additions; patch otherwise. A component's first release is `1.0.0`.

  Metadata-class changes (legacy keys, ids, implementations) are summarized per commit as
  `metadata: {count, fields}` rather than listed, each entry is one line in the committed file, and
  the pending `unreleased` release is taken over by the next real release.

- [#1582](https://github.com/adobe/spectrum-design-data/pull/1582) [`9b4ad35`](https://github.com/adobe/spectrum-design-data/commit/9b4ad35c29fb00193e5847625699afb04fa0c560) Thanks [@GarthDB](https://github.com/GarthDB)! - Add a draft component visual recipe format for rendering to SVG, PNG, and Figma.
  - **spec/component-visuals.md**: draft RFC and schema; `design-data:validate` checks recipes.
  - **action-button**: pilot recipe `visuals/action-button.json`; adds `progress`, `isPending`.
  - **sdk (core, cli)**: `render` makes SVG; `compile_recipe` pre-binds tokens.
  - **sdk/wasm**: `Dataset.renderScene` and `Dataset.renderSvg` render recipes in the browser.
  - **button**: `visuals/button.json` recipe (variant, style, state, static color); `down` state.
  - **spec and renderers**: container `stroke`, `relativeTo: "height"` radius, pressed scale-down.
  - **badge**: recipe and anatomy.
  - **Removed**: badge option `isDisabled`, published in 3.7.1; the design has no disabled badge.
  - **renderers and site**: per-corner radius props, font weight names to numbers, label presence.
  - **sdk/plugins/site**: `design-data site --out <dir>` writes a static explorer (no WASM).
  - **sdk/plugins/figma**: `variable_names` maps tokens to Figma variable names offline.
  - **sdk/core**: scene token refs carry alias `chain`; press tokens are tracked.
  - **switch**: `visuals/switch.json` recipe, anatomy, `hideLabel`, and 15 color relationships.
  - **sdk/core, site**: nested box layout, `around` ring, `pressTarget`, component-scoped sizes.
  - **spec rules**: SPEC-060..063 check recipes against components (`validate --visuals-path`).
  - **checkbox**: `visuals/checkbox.json` recipe, anatomy, `box`/`dash` terms; `glyph` draws marks.

- [#1582](https://github.com/adobe/spectrum-design-data/pull/1582) [`9b4ad35`](https://github.com/adobe/spectrum-design-data/commit/9b4ad35c29fb00193e5847625699afb04fa0c560) Thanks [@GarthDB](https://github.com/GarthDB)! - Validate option constraints in the Rust SDK.
  - **SPEC-064** (error, Layer 2): every option name and value in a constraint's `when` / `require`
    must be declared in the component's `options`. Silent when an option has no `values` list.
  - **SPEC-065** (warning, Layer 2): a visual recipe rule or relationship `scope.options` that
    matches only combinations excluded by an `error` constraint.
  - **sdk/core**: new `constraints` module reads `component.constraints` into a typed model.
  - Conformance fixtures for both rules under `conformance/{valid,invalid}`.

- [#1582](https://github.com/adobe/spectrum-design-data/pull/1582) [`9b4ad35`](https://github.com/adobe/spectrum-design-data/commit/9b4ad35c29fb00193e5847625699afb04fa0c560) Thanks [@GarthDB](https://github.com/GarthDB)! - Add `constraints` to the component format: if-then rules that limit valid option combinations.
  - **spec/option-constraints.md**: `when` / `require` / `severity` (`error` or `advisory`).
  - **component.schema.json**: optional `constraints` array. Layer 1 checks shape only; Layer 2
    checks names and values.
  - **button, action-button, checkbox**: first constraints, taken from react-spectrum S2.

- [#1592](https://github.com/adobe/spectrum-design-data/pull/1592) [`0e42d28`](https://github.com/adobe/spectrum-design-data/commit/0e42d28bc2e6411bb950e3c4209d0c462e7ac43e) Thanks [@GarthDB](https://github.com/GarthDB)! - `validate --platform` now reports a platform manifest that cannot apply (SPEC-082).

  **Spec:** new rule SPEC-082 `platform-manifest-applies` (error). A platform manifest MUST apply
  to the foundation dataset; a validator that cannot apply it MUST report an error, not skip the
  platform rules silently. It stays silent when an `include`/`exclude` entry does not parse
  (SPEC-039 reports that).

  **CLI:** SPEC-076, SPEC-079 and the platform recipe checks returned nothing when the manifest
  failed to apply, so `validate --platform <id>` exited 0. It now reports SPEC-082 and **exits 1
  when the manifest cannot apply**. `validate --platform ios` without `--mode-sets-path` (the iOS
  manifest extends `contrast`) now fails instead of passing. Manifests that apply are unchanged.

  **WASM:** the rule is in the core set; WASM validate passes no manifest, so nothing changes.

- [#1582](https://github.com/adobe/spectrum-design-data/pull/1582) [`9b4ad35`](https://github.com/adobe/spectrum-design-data/commit/9b4ad35c29fb00193e5847625699afb04fa0c560) Thanks [@GarthDB](https://github.com/GarthDB)! - Check that visual recipes still resolve under a platform manifest.

  **Spec:**
  - New warning SPEC-076: every token or relationship binding a recipe resolves on the foundation
    must also resolve once the platform manifest's cascade is applied.
  - New conformance fixture `invalid/SPEC-076`.

  **CLI:**
  - `design-data validate --platform <id> --visuals-path <dir>` runs SPEC-076 and names each binding
    the platform drops. It reuses the render scene diagnostics.

  **Platforms:**
  - The iOS manifest no longer carries an `include` whitelist. It shipped only a few properties,
    which dropped the height, padding, font-size and icon-size tokens recipes bind.

- [#1585](https://github.com/adobe/spectrum-design-data/pull/1585) [`8934646`](https://github.com/adobe/spectrum-design-data/commit/89346465f929583bd76494270e4454df5af22381) Thanks [@GarthDB](https://github.com/GarthDB)! - Validate platform-owned visual recipes. SPEC-079 and SPEC-080 are now enforced.

  **Spec:**
  - SPEC-079 (warning): a recipe in a platform's `extensions/visuals/` must render over the
    request grid without a scene diagnostic. It is planned to become an error in a later minor
    release.
  - SPEC-080 (info): a platform recipe that replaces a foundation recipe reports the pair.
  - Conformance fixtures `invalid/SPEC-079`, `invalid/SPEC-080` and `valid/SPEC-079`.

  **CLI:**
  - `design-data validate --platform <id>` runs the recipe rules SPEC-060 to 063, 066 to 071 and 075
    over platform-owned recipes. SPEC-076 skips a foundation recipe the platform replaces. Output
    is unchanged when the manifest ships no `extensions/visuals/`.

  **WASM:** the core change is compiled in; `Dataset.validate()` passes no manifest, so its
  output is unchanged.

- [#1582](https://github.com/adobe/spectrum-design-data/pull/1582) [`9b4ad35`](https://github.com/adobe/spectrum-design-data/commit/9b4ad35c29fb00193e5847625699afb04fa0c560) Thanks [@GarthDB](https://github.com/GarthDB)! - Load platform-owned visual recipes and add `componentAliases`.

  **Spec:**
  - `manifest.schema.json` accepts `componentAliases` (string to string).
  - New error SPEC-081: an alias key must be a foundation component, its target must be declared in
    the platform's `extensions/components/`, aliases must not chain or cycle, and a key must not
    also be replaced there. New conformance fixture `invalid/SPEC-081`.

  **SDK core:**
  - A platform's `extensions/visuals/<component>.json` loads into `graph.visuals` with
    `layer: Platform` and replaces the foundation recipe of the same name. A bad fragment or a
    file name that differs from `component` is an error naming the file.
  - `TokenGraph::canonical_component` returns the alias target under the active platform.

- [#1582](https://github.com/adobe/spectrum-design-data/pull/1582) [`9b4ad35`](https://github.com/adobe/spectrum-design-data/commit/9b4ad35c29fb00193e5847625699afb04fa0c560) Thanks [@GarthDB](https://github.com/GarthDB)! - Spec text for platform-owned visual recipes. SPEC-079 and SPEC-080 are planned, not yet enforced.
  - `component-visuals.md`: platform recipes in `extensions/visuals/` replace the
    foundation recipe whole; SPEC-079 and SPEC-080.
  - `manifest.md`: capability-matrix rows, the `extensions/visuals/` entry and the
    `componentAliases` field (SPEC-081, enforced; see `platform-recipes-core`).
  - `artifact-moves.md`: a platform recipe moves with its component and alias.
  - `rules.yaml`: adds SPEC-079 (warning, an error one minor version later) and
    SPEC-080 (info), both marked planned, and SPEC-081 (error). SPEC-077 and 078
    stay reserved by `artifact-moves.md`.

- [#1586](https://github.com/adobe/spectrum-design-data/pull/1586) [`706b12e`](https://github.com/adobe/spectrum-design-data/commit/706b12e542d49218571e4b9f2b478481a926c852) Thanks [@GarthDB](https://github.com/GarthDB)! - Visual recipe selectors can use `{<option>}` placeholders, such as `{style}`, for any option.

  **Spec:**
  - `component-visuals.md`: `{<option>}` expands to each value the option declares. A candidate
    found for one value applies only when the request's option equals it.
  - A brace pair whose content is not a plain identifier stays literal text. `{size}` and
    `{sizeIndex}` are unchanged.
  - SPEC-061 also reports a `{name}` placeholder in a `token` or `relationship` selector that is
    not `size`, `sizeIndex` or a declared option that lists its values.
  - SPEC-062, 066, 067, 069 and 071 expand option placeholders before resolving.
  - The `invalid/SPEC-061` conformance fixture covers the new check.

  **WASM:** `compile_recipe` and `render` expand option placeholders. A recipe that uses none
  compiles to exactly the same output as before.

  **CLI:** `design-data render`, `site` and `validate` use the same expansion. The native binary
  is versioned by `@adobe/design-data-tui`.

- [#1596](https://github.com/adobe/spectrum-design-data/pull/1596) [`6d42e98`](https://github.com/adobe/spectrum-design-data/commit/6d42e98631aa1dd640fd244689ebb029f0f44f07) Thanks [@GarthDB](https://github.com/GarthDB)! - New rule SPEC-083 warns when a visual recipe binds a prop the renderer does not read.

  **Spec:**
  - `rules.yaml` and `component-visuals.md`: SPEC-083 (warning) flags a part prop the renderer
    ignores for that part, such as `opacity`, `direction` or `fill` on a text part. A conformance
    fixture covers it.

  **WASM and CLI:** `validate` runs SPEC-083 on foundation and platform recipes. The list of read
  props is the renderer's own table (`READ_PROPS` in `visual.rs`). The solver checks every prop it
  reads against that table in debug builds, through the same function the rule uses, so the two
  cannot drift. Rendering is unchanged. The five foundation recipes bind root `direction`, `align`
  and `justify`, which the solver never reads. They are in the recipe lint baseline and tracked as
  their own issues.

  Bump levels: all three are minor because validation gains a rule and no output changes.

- [#1610](https://github.com/adobe/spectrum-design-data/pull/1610) [`2ec8e9e`](https://github.com/adobe/spectrum-design-data/commit/2ec8e9ed217a01bb81eefe8b1950be79e81cf98d) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(spec): relationship `uuid` is required (SPEC-084)

  `relationship.schema.json` now requires `uuid`, and the new rule SPEC-084
  (`ctr-uuid-required`) also covers platform manifest adds. SPEC-056 still enforces
  uniqueness. A `uuid` no longer marks a value-owning relationship, so SPEC-058 and
  SPEC-072 identify those by `legacyKey`. Conformance fixtures now carry uuids.

- [#1589](https://github.com/adobe/spectrum-design-data/pull/1589) [`5770c02`](https://github.com/adobe/spectrum-design-data/commit/5770c0285f7c7d6a005752c7e37b8d89129a4e9a) Thanks [@GarthDB](https://github.com/GarthDB)! - Visual recipes can bind `paddingBlockStart` and `paddingBlockEnd`, and the renderer now draws them.

  **Spec:**
  - `component-visuals.md`: a root `box` with no `height` is 32 high, unless the recipe binds block
    padding. Then its height is the tallest flowed child plus the block padding, and the children
    sit between the paddings. An explicit `height` always wins.

  **WASM and CLI:** `render`, `site` and the JS runtime apply block padding the same way. A recipe
  that binds no block padding renders exactly as before; no foundation recipe binds it today.
  The native binary is versioned by `@adobe/design-data-tui`.

  Bump levels: all three are minor because the renderer gains a capability (a new normative rule
  for the spec) and no output changes for existing recipes.

- [#1590](https://github.com/adobe/spectrum-design-data/pull/1590) [`f3d8058`](https://github.com/adobe/spectrum-design-data/commit/f3d8058832f9932aebf6732aaf176da58e0cde77) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix corner rounding when a recipe's radius is larger than half the box.

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

- [#1595](https://github.com/adobe/spectrum-design-data/pull/1595) [`76edc46`](https://github.com/adobe/spectrum-design-data/commit/76edc466c835b4afa6f0368f959e2b08a39c24bc) Thanks [@GarthDB](https://github.com/GarthDB)! - Visual recipes can bind `lineHeight` and `fontFamily` on text parts, and the renderer honors them.

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

- [#1598](https://github.com/adobe/spectrum-design-data/pull/1598) [`63c60e0`](https://github.com/adobe/spectrum-design-data/commit/63c60e09e16045552cb4b62c6b4d6e6d0b193dfb) Thanks [@GarthDB](https://github.com/GarthDB)! - Visual recipes can bind `opacity` on the root part, and the renderer honors it.

  **Spec:** `component-visuals.md` says renderers read `opacity` only on the root part and
  dim the whole component as one group, the way iOS dims a disabled control.

  **WASM and CLI:** `render`, `site` and the JS runtime wrap the drawing in one
  `<g opacity>` when the root binds `opacity`. A scene gains `opacity` only when it is bound,
  so existing scene JSON and SVG are unchanged. SPEC-083 no longer flags `opacity` on a root
  part. The native binary is versioned by `@adobe/design-data-tui`.

- [#1600](https://github.com/adobe/spectrum-design-data/pull/1600) [`8dbea28`](https://github.com/adobe/spectrum-design-data/commit/8dbea2863b11a7dbfc1aee58314ad8a5ca040475) Thanks [@GarthDB](https://github.com/GarthDB)! - The visual renderer reads the root part's `direction`, `align` and `justify`.
  - **direction**: `row` (default) or `column`. A column is as wide as its widest child.
  - **align**: `start`, `center` (default) or `end`, across the layout direction.
  - **justify**: `start`, `center` (default) or `end`, along a column with a set height.
    A row is as wide as its content, so `justify` does nothing there.
  - Any other value is a render diagnostic and keeps the default.
  - SPEC-083 no longer warns about these props; existing recipes render unchanged.

- [#1607](https://github.com/adobe/spectrum-design-data/pull/1607) [`130285e`](https://github.com/adobe/spectrum-design-data/commit/130285e72a847e6ce15b73457d1813bed30cb94e) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(spec): draft JSON Schema for the component spec-sheet model

  Adds `component-spec-sheet.schema.json`: pages of blocks, one block per relationship context.
  A block holds a render request with its scene, token rows with option labels, notes and
  change markers. `design-data spec-sheet <component>` generates the model from the recipe,
  relationships and scene output.

- [#1598](https://github.com/adobe/spectrum-design-data/pull/1598) [`63c60e0`](https://github.com/adobe/spectrum-design-data/commit/63c60e09e16045552cb4b62c6b4d6e6d0b193dfb) Thanks [@GarthDB](https://github.com/GarthDB)! - SPEC-063 lets a component with no `size` option declare a one-entry `sizeScale`, the single
  size renderers draw (for example the fixed-size iOS switch). Zero or several entries on such a
  component are an error. `component-visuals.md` and `rules.yaml` say so. The native binary
  is versioned by `@adobe/design-data-tui`.

### Patch Changes

- [#1582](https://github.com/adobe/spectrum-design-data/pull/1582) [`9b4ad35`](https://github.com/adobe/spectrum-design-data/commit/9b4ad35c29fb00193e5847625699afb04fa0c560) Thanks [@GarthDB](https://github.com/GarthDB)! - A box placed directly in a row now paints itself, so checkbox and switch no longer need a
  render-only `control` part.
  - Renderer and JS runtime read `fill`, `stroke` and `strokeWidth` on a flowed box.
  - Checkbox and switch drop `control`. The box and the track carry the size and hold the marks
    and the handle. Rendered geometry, colors and press scale are unchanged.
  - Relationships that named `control` now name `box` (checkbox) or `track` (switch).
  - Checkbox and switch anatomy are now reviewed.

- [#1612](https://github.com/adobe/spectrum-design-data/pull/1612) [`17f8c31`](https://github.com/adobe/spectrum-design-data/commit/17f8c318d0eba50640d4892bdd07f18ea3cd6920) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(spec): spec-sheet markers per token group, Bindings changed badge, dataset revision

  In the draft `component-spec-sheet.schema.json`, `render.markers` number 1..n per group of
  token rows and each token item carries its `marker` (rows no longer do). Blocks can show a
  "Bindings changed" badge, and the sheet carries `datasetRevision`, the same revision the
  changelog records.

- [#1611](https://github.com/adobe/spectrum-design-data/pull/1611) [`6b25821`](https://github.com/adobe/spectrum-design-data/commit/6b25821dfde7fc9d0f6401f7cb8ab436cbd34cab) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(core): scene token refs carry the relationship that bound them

  `TokenRef` gains `relationship` (`uuid`, `context`, `property`) when a value came through a
  relationship binding, so overlays name the relationship property, not the token's legacy key.
  The spec-sheet `render.measurements` now lists the scene measurements whose relationship
  context is the block title, each labelled with the relationship property.

- [#1582](https://github.com/adobe/spectrum-design-data/pull/1582) [`9b4ad35`](https://github.com/adobe/spectrum-design-data/commit/9b4ad35c29fb00193e5847625699afb04fa0c560) Thanks [@GarthDB](https://github.com/GarthDB)! - Recipe `when.options` conditions now accept an array of values, as the spec already described.
  - **sdk/core, site runtime**: an array matches when any value matches and counts as one condition.
  - **SPEC-061**: checks each element of an array condition against the option's declared values.
  - **spec**: component-visuals states that an array counts as one condition.
  - **button**: static color rules for primary and secondary share one entry with `variant: [...]`.

## 4.8.1

### Patch Changes

- [#1573](https://github.com/adobe/spectrum-design-data/pull/1573) [`6c59c1f`](https://github.com/adobe/spectrum-design-data/commit/6c59c1ffc26ee80e11b1354c8e97d1479023af30) Thanks [@GarthDB](https://github.com/GarthDB)! - A platform manifest override now keeps every field of the record it replaces.

  **Spec:**
  - `manifest.md` `overrides` now says what the code already did: the override replaces the
    foundation record for that platform's graph (same key and uuid).
  - `query` returns one record per token.
  - Defines the in-memory markers `overriddenBy` and `overriddenFrom`. Legacy output omits them.

  **Core and WASM:**
  - An override no longer drops `$schema`, `$valueType`, `lifecycle`, `description` or
    `conceptId`. It changes only `value` or `$ref`.
  - A replaced record carries `overriddenBy` (`{platform}` or `{manifest}`) and
    `overriddenFrom` (the foundation value, kept even after several overrides).
  - Output with no platform is unchanged. With the iOS manifest, the three teal overrides
    now keep their `$schema`, `uuid` and `private` fields.

- [#1572](https://github.com/adobe/spectrum-design-data/pull/1572) [`a60aeea`](https://github.com/adobe/spectrum-design-data/commit/a60aeea243b2ac4e812d46bbd9f7140c9f62f398) Thanks [@GarthDB](https://github.com/GarthDB)! - Add SPEC-072, a warning for a relationship that duplicates another record's `$ref`.

  Two relationship records with the same scope, context and `$ref` leave the token's other scale
  unreachable when the token has a scale counterpart. Validation now reports the second record and
  names the counterpart. A repeated record on a token with no scale counterpart is not reported.
  The current data has no such duplicates after the repoint in this PR.

## 4.8.0

### Minor Changes

- [#1550](https://github.com/adobe/spectrum-design-data/pull/1550) [`18431aa`](https://github.com/adobe/spectrum-design-data/commit/18431aa6bb40fee2838030592940195c42a6a1d4) Thanks [@GarthDB](https://github.com/GarthDB)! - <!-- Copyright 2026 Adobe. All rights reserved. -->

  Allow platform terminology crosswalks to reference existing modes in active mode sets.
  - **spec/manifest.md**: define mode-set targets and validate terms after manifest mode-set edits.
  - **schemas/platform-extension.json**: describe registry and mode-set crosswalk targets.

## 4.7.0

### Minor Changes

- [#1538](https://github.com/adobe/spectrum-design-data/pull/1538) [`a5fc42f`](https://github.com/adobe/spectrum-design-data/commit/a5fc42ff5dc5b1c0dbc569a733021061e3a57115) Thanks [@GarthDB](https://github.com/GarthDB)! - Token-type schemas and `naming-exceptions.json` now live in canonical packages.
  - **design-data-spec/schemas**: authoritative `token-types/` and `token-file.json`, exported as
    `@adobe/design-data-spec/schemas/*`. `sync-token-schemas.mjs` generates copies; CI checks drift.
  - **design-data/naming-exceptions.json**: moved here from `packages/tokens`.
  - **packages/tokens**: `schemas/` and `naming-exceptions.json` are now generated copies.
  - **docs/site/public/schemas**: regenerated, which updates six drifted files at the `$id` URLs.
  - **sdk CLI**: resolves the new locations first, falls back to the old layout for older tags,
    and bumps the embedded snapshot layout.
  - **tools/design-data**: `validate` resolves schemas through `@adobe/design-data-spec`.

### Patch Changes

- [#1539](https://github.com/adobe/spectrum-design-data/pull/1539) [`da64677`](https://github.com/adobe/spectrum-design-data/commit/da6467789ff0277102c4972703842fc0112e73eb) Thanks [@GarthDB](https://github.com/GarthDB)! - Platform manifests pin `foundationVersion` to the canonical package (closes xqln.18).
  - **platforms/**: pin `@adobe/spectrum-design-data@3.5.0` instead of `@adobe/spectrum-tokens`.
  - **packages/design-data-spec/**: document the tag format in the manifest spec and schema.
  - **sdk/cli/**: `platform show` drift check compares the version part of the tag.

## 4.6.0

### Minor Changes

- [#1483](https://github.com/adobe/spectrum-design-data/pull/1483) [`418cc0d`](https://github.com/adobe/spectrum-design-data/commit/418cc0d4b95e3b6b7cc70779e55d09173c88c357) Thanks [@GarthDB](https://github.com/GarthDB)! - Add platform-specific component option aliases and validate their canonical values.
  - **packages/design-data-spec**: Add `componentOptions` extensions with canonical-value validation.
  - **packages/design-data**: Add Button option mappings for React Spectrum and Web Components.

### Patch Changes

- [#1533](https://github.com/adobe/spectrum-design-data/pull/1533) [`6375e4b`](https://github.com/adobe/spectrum-design-data/commit/6375e4b83333f51f012d8f95df35a20d8a792340) Thanks [@GarthDB](https://github.com/GarthDB)! - Ship a generated `llms.txt` with each consumer-facing package (closes #1533).
  - **package.json (10 packages)**: add `llms.txt` to the npm `files` list.
  - **llms.txt**: generated from each README and `.ai/inventory.json` by `pnpm ai:sync`.

## 4.5.0

### Minor Changes

- [#1516](https://github.com/adobe/spectrum-design-data/pull/1516) [`1cce74b`](https://github.com/adobe/spectrum-design-data/commit/1cce74b35a7ecb48302b7114cd89063604ca8440) Thanks [@GarthDB](https://github.com/GarthDB)! - Platform manifests can now own their component implementation mappings through a new
  `extensions/implementations/` category, refining foundation defaults row by row.
  - **schemas/implementation-mapping.schema.json**: new fragment schema — `component` plus
    implementation rows to upsert, or `op: "remove"` selectors.
  - **schemas/component.schema.json**: implementations accept `package` and `importPath`
    together, and gain an optional `implementation` registry id.
  - **spec/manifest.md**, **spec/component-format.md**: document ownership, upsert identity,
    remove selectors, and foundation-default layering.
  - **conformance/manifest-extensions/**: valid and invalid fixtures for the new category.

## 4.4.0

### Minor Changes

- [#1514](https://github.com/adobe/spectrum-design-data/pull/1514) [`9d3a14f`](https://github.com/adobe/spectrum-design-data/commit/9d3a14fb4c7ed956f93b87ccee6565c73b940ed5) Thanks [@GarthDB](https://github.com/GarthDB)! - Add a `prefix` property to manifest `formatting` (closes DNA-1741).
  - **manifest.schema.json**: `formatting.prefix` (string) is prepended to a
    formatted name, after casing/delimiter, unaffected by them — for wrapping
    conventions like CSS custom properties (`--spectrum-`).
  - **spec/manifest.md**: documents the new field alongside `conceptOrder`,
    `casing`, `delimiter`, `abbreviations`.

## 4.3.0

### Minor Changes

- [#1479](https://github.com/adobe/spectrum-design-data/pull/1479) [`e483c9c`](https://github.com/adobe/spectrum-design-data/commit/e483c9cf74acf463c9a3d2be4caba7689e3dc27c) Thanks [@GarthDB](https://github.com/GarthDB)! - Add foundation-owned component platform implementation metadata.
  - **schemas/component.schema.json**: support implementation names and package or
    import-path references for component consumers.

## 4.2.1

### Patch Changes

- [#1476](https://github.com/adobe/spectrum-design-data/pull/1476) [`046e4e6`](https://github.com/adobe/spectrum-design-data/commit/046e4e65930d5fd17b55ee2c9ce880e1e049f99a) Thanks [@GarthDB](https://github.com/GarthDB)! - Document the `export` CLI subcommand and `--format dtcg` output in the
  agent-readable surface spec.
  - **spec/agent-surface.md**: list `export` alongside the existing
    reference-CLI subcommands and note `--format dtcg` support on
    `resolve`/`query`/`export`.

## 4.2.0

### Minor Changes

- [#1449](https://github.com/adobe/spectrum-design-data/pull/1449) [`57b9a04`](https://github.com/adobe/spectrum-design-data/commit/57b9a04243a13b151931e5b36876b857f6ac5ffe) Thanks [@GarthDB](https://github.com/GarthDB)! - Platform manifests can now add, remove, or retarget a single mode value (or remove a whole
  set) in `extensions/mode-sets/` via an `op` field, instead of only declaring or replacing
  the entire set.
  - **spec/manifest.md**: documented the `addMode` / `removeMode` / `setDefault` / `remove`
    op grammar and updated the capability matrix.
  - **spec/mode-sets.md**: cross-referenced the new ops alongside the existing
    declare-or-replace semantics.
  - **conformance/manifest-extensions/**: added valid and invalid fixtures covering each op.

## 4.1.0

### Minor Changes

- [#1428](https://github.com/adobe/spectrum-design-data/pull/1428) [`6005339`](https://github.com/adobe/spectrum-design-data/commit/6005339a0678226eee3e827fd5bbfa793f5bccc7) Thanks [@GarthDB](https://github.com/GarthDB)! - Add a canonical `conceptId` UUID shared by every mode row of a design concept (closes the
  concept-identity gap in proposal 013), and retire the transitional `set_uuid` cascade-migration
  bridge field in the same release now that `conceptId` fully subsumes its role.
  - **packages/tokens/schemas/token-types/alias.json**: removed `set_uuid`; `conceptId` was
    already documented alongside `uuid` on the token schema.
  - **packages/design-data/tokens/\*.tokens.json**: backfilled `conceptId` on every token
    (reusing existing `set_uuid` values where present) and removed `set_uuid`.
  - **sdk/core/src/{graph,legacy,migrate,figma/import}.rs**: re-keyed concept grouping,
    legacy-output reconstruction, migration, and Figma import onto `conceptId`; CTR-side
    camelCase `setUuid`/`setSchema` bridging is unchanged. `set_schema` is retained as-is —
    it encodes set-type, not concept identity.
  - **sdk/core/src/validate/rules/spec059.rs** (new): `alias-mode-context-compatibility`,
    a mode analogue of SPEC-002 flagging an alias pinned to a mode-mismatched target.
  - **spec/{cascade,token-format}.md**: normativize `conceptId` and context-aware `$ref`
    resolution against a `conceptId` anchor.
  - **conformance fixtures**: renamed `set_uuid` → `conceptId` throughout.

## 4.0.0

### Major Changes

- [#1420](https://github.com/adobe/spectrum-design-data/pull/1420) [`211d661`](https://github.com/adobe/spectrum-design-data/commit/211d66122892000939944b43427f35e356a5ae51) Thanks [@GarthDB](https://github.com/GarthDB)! - Redefine platform-manifest `extensions` as a sibling `extensions/` directory (one file
  per artifact, glob-discovered and merged at load time) instead of a single inline
  object, so per-platform additions can scale past a handful of components.
  - **schemas/manifest.schema.json**: removed the inline `extensions` object; a manifest
    using the old inline shape now fails Layer 1 validation. Added optional
    `extensionsDir` (default `"extensions"`) and promoted `namingExceptions`/`formatting`
    to top-level manifest fields.
  - **spec/manifest.md**: documents the `extensions/` directory layout, glob discovery,
    and merge/precedence rules (deep-merge for `tokens/`, sorted-path-order/last-wins for
    the other catalogs, override/remove-by-uuid for `relationships/`), and the
    per-fragment schema each subdirectory validates against.
  - **reference SDK loader**: glob-discovers and merges each `extensions/` subdirectory
    at manifest load time, schema-validating every fragment file against its category's
    real JSON schema before merging it in.

## 3.5.0

### Minor Changes

- [#1394](https://github.com/adobe/spectrum-design-data/pull/1394) [`5e22a7a`](https://github.com/adobe/spectrum-design-data/commit/5e22a7a18cd1a4f2a5957cba9cafa66bef73ed63) Thanks [@GarthDB](https://github.com/GarthDB)! - Re-point component/token relationship (CTR) `$ref`s that pointed at deprecated tokens
  (e.g. accordion spacing bindings still referencing tokens deprecated by SDS-15500) onto
  their live `lifecycle.replacedBy` target, and add a rule that catches regressions.
  - **packages/design-data/relationships/\*.json**: 1,366 relationship-only `$ref`s
    re-pointed to their live replacement via `lifecycle.replacedBy`; 285 with no
    replacement pointer are left as-is and now surface as SPEC-058 warnings. Does not
    change `packages/tokens/src/` (`@adobe/spectrum-tokens`) — verified byte-identical.
  - **migrate-to-relationships.mjs** and **seed-token-bindings.mjs**: resolve through
    `lifecycle.replacedBy` when emitting a `$ref`, so re-running either generator can't
    reintroduce a deprecated reference.
  - **sdk/core/src/validate/rules/spec058.rs**: new warning rule (`ctr-ref-not-deprecated`)
    flagging a relationship-only CTR whose `$ref` resolves to a deprecated token.
  - **packages/design-data-spec/rules/rules.yaml**: catalogs SPEC-058.

## 3.4.1

### Patch Changes

- [`a1d6e8a`](https://github.com/adobe/spectrum-design-data/commit/a1d6e8a8df15106aaaec047077d4d09011247227) Thanks [@GarthDB](https://github.com/GarthDB)! - Clarify two manifest cascade behaviors surfaced by the iOS platform manifest POC.
  - **spec/manifest.md**: documents that overrides land as new platform-layer records, not
    in-place edits (`query` double-counts an overridden token; only `resolve` picks the
    cascade winner), and recommends validators reject a pre-cascade-format `foundationVersion`.

## 3.4.0

### Minor Changes

- [#1388](https://github.com/adobe/spectrum-design-data/pull/1388) [`17239f3`](https://github.com/adobe/spectrum-design-data/commit/17239f31fe23279e1034ef4dd1d1c3072d550a16) Thanks [@GarthDB](https://github.com/GarthDB)! - Let a platform manifest carry field declarations as a first-class,
  cascade-consumable `extensions` section (bead spectrum-design-data-h890.23.2),
  continuing the cascade parity work started for components/platformExtensions
  in h890.22.
  - **packages/design-data-spec/schemas/manifest.schema.json**: `extensions`
    gains `fields` (array of `field.schema.json` items).
  - **packages/design-data-spec/spec/manifest.md**: capability matrix and a new
    `extensions.fields` subsection document the add-or-replace-by-name
    semantics, including the `conceptOrder` name-reference caveat.
  - **sdk/core/src/graph.rs**: `apply_platform_manifest` adds a guarded section
    that add-or-replaces into the field catalog by `name`, reusing the
    existing `FieldRecord`/`load_spec_fields` and `upsert_by_key` — no
    struct change, so no cache-schema-version bump is needed.

- [#1387](https://github.com/adobe/spectrum-design-data/pull/1387) [`eb6e57f`](https://github.com/adobe/spectrum-design-data/commit/eb6e57f47c6bb38e2675418e9ef7f0737a385f3b) Thanks [@GarthDB](https://github.com/GarthDB)! - Let a platform manifest carry guideline documents as a first-class,
  cascade-consumable `extensions` section (bead spectrum-design-data-h890.23.1),
  continuing the cascade parity work started for components/platformExtensions
  in h890.22.
  - **packages/design-data-spec/schemas/manifest.schema.json**: `extensions`
    gains `guidelines` (array of `guideline.schema.json` items).
  - **packages/design-data-spec/spec/manifest.md**: capability matrix and a new
    `extensions.guidelines` subsection document the add-or-replace-by-name
    semantics.
  - **sdk/core/src/graph.rs**: `apply_platform_manifest` adds a guarded section
    that add-or-replaces into the guideline catalog by `name`, reusing the
    existing `GuidelineRecord`/`load_spec_guidelines` and `upsert_by_key` — no
    struct change, so no cache-schema-version bump is needed.

- [#1390](https://github.com/adobe/spectrum-design-data/pull/1390) [`3aa312d`](https://github.com/adobe/spectrum-design-data/commit/3aa312db6a055108f685b832dfafdf195ab088fc) Thanks [@GarthDB](https://github.com/GarthDB)! - Let a platform manifest overlay add/remove naming exceptions onto the base
  set used by naming validation (bead spectrum-design-data-h890.23.4),
  completing the cascade parity work for h890.23.
  - **packages/design-data-spec/schemas/manifest.schema.json**: `extensions`
    gains `namingExceptions` (`{ add, remove }`, both optional arrays of
    non-empty strings).
  - **packages/design-data-spec/spec/manifest.md**: capability matrix and a new
    `extensions.namingExceptions` subsection document the add/remove overlay
    semantics (`remove` applied before `add`, so add wins on overlap).
  - **sdk/core/src/naming.rs**: new `apply_naming_exceptions_overlay` helper;
    naming exceptions stay a plain `HashSet<String>` outside `TokenGraph`, so
    the overlay is applied where `validate_all_with_full_options` already
    loads the sibling `manifest.json`, rather than as a graph-cascade section.

- [#1389](https://github.com/adobe/spectrum-design-data/pull/1389) [`e0300ab`](https://github.com/adobe/spectrum-design-data/commit/e0300ab6167bc237c83d9d45885a10405c10b974) Thanks [@GarthDB](https://github.com/GarthDB)! - Let a platform manifest add, override, or remove Component/Token
  Relationship (CTR) entries via a new `extensions.relationships` section
  (bead spectrum-design-data-h890.23.3), continuing the cascade parity work
  started for components/platformExtensions in h890.22.
  - **packages/design-data-spec/schemas/manifest.schema.json**: `extensions`
    gains `relationships` (array of `relationship.schema.json` items, or
    `{op: "override"|"remove", uuid, value?}` targeting entries).
  - **packages/design-data-spec/spec/manifest.md**: capability matrix and a
    new `extensions.relationships` subsection document the identity model —
    add is positional, override/remove require a `uuid` since relationships
    have no other stable key.
  - **sdk/core/src/graph.rs**: `apply_platform_manifest` adds a guarded
    section handling add/override/remove, reusing the existing
    `RelationshipRecord`. Add always appends, even on a `uuid` collision;
    override/remove require an explicit `uuid` or error.

### Patch Changes

- [#1386](https://github.com/adobe/spectrum-design-data/pull/1386) [`ca62801`](https://github.com/adobe/spectrum-design-data/commit/ca62801f3e84f295d5945c3e57793bb5d50a6b1b) Thanks [@GarthDB](https://github.com/GarthDB)! - Document the full platform manifest capability matrix and fill in missing `extensions` sub-keys.
  - **spec/manifest.md**: adds a capability matrix (what a platform manifest
    can override, alias, add, or remove, and what it can't) and documents
    `extensions.tokens`, `extensions.components`, and
    `extensions.platformExtensions`, previously undocumented despite being
    applied by the SDK.

- [#1391](https://github.com/adobe/spectrum-design-data/pull/1391) [`bdbf266`](https://github.com/adobe/spectrum-design-data/commit/bdbf266bc53e30d565531c1c8810688dba6f8348) Thanks [@GarthDB](https://github.com/GarthDB)! - Record the h890.23.5 decision on whether a platform manifest may override
  Layer-1 schemas.
  - **packages/design-data-spec/spec/manifest-schema-override-spike.md**: new
    decision doc — no-go, with rationale (circularity, broken conformance
    guarantees, no concrete need).
  - **packages/design-data-spec/spec/manifest.md**: capability matrix gains an
    explicit "Override Layer-1 schemas" row linking to the decision.

## 3.3.0

### Minor Changes

- [#1380](https://github.com/adobe/spectrum-design-data/pull/1380) [`cc15f52`](https://github.com/adobe/spectrum-design-data/commit/cc15f524d616e7fe602fa7445950ec89ec7a7279) Thanks [@GarthDB](https://github.com/GarthDB)! - Let a platform manifest carry component specs and platform-extension states
  as first-class, cascade-consumable sections, not just tokens — the first
  step in externalizing iOS-specific design data while keeping iOS capability
  in the monorepo (bead spectrum-design-data-h890.22).
  - **packages/design-data-spec/schemas/manifest.schema.json**: `extensions`
    gains `components` (array of `component.schema.json` items) and
    `platformExtensions` (array of `platform-extension.json` items).
  - **sdk/core/src/graph.rs**: `apply_platform_manifest` adds two guarded
    sections — `extensions.components` add-or-replaces into the component
    catalog by name; `extensions.platformExtensions` add-or-replaces by
    `(platform, extends)` and rejects a `termId` that doesn't exist in the
    referenced base registry.

- [#1376](https://github.com/adobe/spectrum-design-data/pull/1376) [`adf5595`](https://github.com/adobe/spectrum-design-data/commit/adf55951bf3c753f5c448d869c04959cc229bf6b) Thanks [@GarthDB](https://github.com/GarthDB)! - Schema-validate `extensions.tokens` in the platform manifest, closing a gap
  where malformed extension tokens (bad `$schema`, missing `name`) previously
  failed silently or downstream instead of at manifest-validation time (closes
  bead spectrum-design-data-9osr).
  - **packages/design-data-spec/schemas/manifest.schema.json**: `extensions.tokens`
    now references `cascade-file.schema.json`, so entries must match the same
    cascade token shape as `token.schema.json`.
  - **sdk/core/src/schema.rs**: `SchemaRegistry::validate_manifest` now registers
    sibling schemas (`token.schema.json`, `cascade-file.schema.json`,
    `value-types/*`) via `collect_schema_resources`, so the new cross-schema
    `$ref` resolves offline instead of erroring.

## 3.2.1

### Patch Changes

- [#1349](https://github.com/adobe/spectrum-design-data/pull/1349) [`16a8077`](https://github.com/adobe/spectrum-design-data/commit/16a807797bb8f204ca169bc8d98ed159f8ff04dc) Thanks [@GarthDB](https://github.com/GarthDB)! - Reconcile RFC coordination docs with shipped reality: Phase B, CTR, and guidelines
  were undocumented or stale.
  - **packages/design-data-spec/spec/authoring-workflow.md**: flip Phase B (foundation-corpus
    write path, token lifecycle ops, mode-set management) from "not yet shipped" to shipped;
    clarify `write_component` remains unscheduled.
  - **packages/design-data-spec/spec/agent-surface.md**: promote `write_token` from RECOMMENDED
    to NORMATIVE (MUST), matching the Phase B promotion now reflected in authoring-workflow.md.
  - **docs/rfc-coordination.md**: add RFC-E (Component/Token Relationships) and RFC-F
    (Guidelines/Phase 10) rows, a #1324 draft-RFC row, reference 6 previously-orphaned
    spec files, and refresh #806/#623/#625/#832 with rules and PRs shipped since the
    last update.
  - **docs/token-studio-sunset.md**: mark Phase 1 (foundation-corpus write target) done,
    unblocking Phase 2.

## 3.2.0

### Minor Changes

- [#1327](https://github.com/adobe/spectrum-design-data/pull/1327) [`7035973`](https://github.com/adobe/spectrum-design-data/commit/7035973b5b4b70d8ad89ec0c4979d7b687050a4d) Thanks [@GarthDB](https://github.com/GarthDB)! - Add Component/Token Relationship (CTR) foundation — an anonymous-token
  join entity unifying `tokenBindings` and name-object component scoping.
  - **schemas/relationship.schema.json**: new Layer-1 schema for
    `relationships/*.json`, mirroring `token.schema.json`'s value/`$ref` split.
  - **spec/relationship-format.md**: normative prose for the CTR scope
    model and interim legacy-compatibility fields.
  - **rules/rules.yaml**: SPEC-051..057, headlined by `ctr-option-valid`
    validating a CTR's options against the component's own options schema.

### Patch Changes

- [#1331](https://github.com/adobe/spectrum-design-data/pull/1331) [`38b1b13`](https://github.com/adobe/spectrum-design-data/commit/38b1b134db2ecb41281da6271f5234cd4d935587) Thanks [@GarthDB](https://github.com/GarthDB)! - Add conformance fixtures for the Component/Token Relationship (CTR) rules
  (closes spectrum-design-data-x29.5).
  - **conformance/invalid/SPEC-051..057**: one dataset + expected-errors
    fixture per CTR rule (undeclared component/part/option/state, unresolved
    `$ref`, duplicate `uuid`, missing `legacyKey` warning).
  - **conformance/valid/SPEC-051**: a zero-diagnostic baseline CTR dataset
    covering both value-owning and relationship-only shapes.
  - **conformance/generation/ctr-legacy-key**: proves a value-owning CTR
    reproduces its legacy token byte-identically and a relationship-only
    CTR is filtered out of legacy output.
  - **scripts/check-layout.mjs**: registers the new fixture paths.

## 3.1.0

### Minor Changes

- [#1309](https://github.com/adobe/spectrum-design-data/pull/1309) [`8a9aadb`](https://github.com/adobe/spectrum-design-data/commit/8a9aadbe97480f43675e692fc46293d1fc2e3643) Thanks [@GarthDB](https://github.com/GarthDB)! - Add SPEC-050 to detect fused `name.property` values independent of roundtrip status
  (closes spectrum-design-data-284.1).
  - **rules/rules.yaml**: new advisory rule `SPEC-050` (`property-decomposition-complete`)
    flags a `property` value that fuses a structured field (anatomy, object, position,
    size, state, colorRole, emphasis) instead of being atomic, regardless of roundtrip
    or `naming-exceptions.json` status.
  - **conformance/invalid/SPEC-050/**: new fixture covering the fused-property case.

## 3.0.0

### Major Changes

- [#1302](https://github.com/adobe/spectrum-design-data/pull/1302) [`50d0ffe`](https://github.com/adobe/spectrum-design-data/commit/50d0ffe75b7303bea6b113877b7e559fd4a985de) Thanks [@GarthDB](https://github.com/GarthDB)! - Change token name-object `state` from a single (optionally hyphenated) string to
  an ordered array of atomic state ids (Proposal 006, supersedes Proposal 005's
  hyphenated-compound encoding).
  - **docs/proposals/006-compound-states-as-array.md**: new proposal; Proposal 005
    marked superseded.
  - **packages/design-data/fields/state.json**, **registry/states.json**: `state`
    is now `array` type; dropped the dead compound-hyphenation pattern.
  - **packages/design-data-spec/schemas**: name-object `state` is now an array of
    atomic ids, `minItems: 1`; `field.schema.json`'s `valueType` enum gained
    `"array"` so `state.json` validates structurally.
  - **packages/design-data/tokens/\*.tokens.json**: every token's `name.state`
    migrated to array form (`"hover"` → `["hover"]`, `"selected-hover"` →
    `["selected", "hover"]`).
  - **sdk/core**: `NameObject.state` is `Option<Vec<String>>`; legacy-key
    generation and validation rules updated for array state. Query filters
    (`state=x`) now match any element of a compound array — see `spec/query.md`.
  - **tools/token-mapping-analyzer**: JS decomposer kept in parity with Rust.

## 2.9.0

### Minor Changes

- [#1280](https://github.com/adobe/spectrum-design-data/pull/1280) [`fb94215`](https://github.com/adobe/spectrum-design-data/commit/fb942159265526230b069ffd38f6f52590979582) Thanks [@GarthDB](https://github.com/GarthDB)! - Relaxed SPEC-025 so `anatomy` can anchor to a `structure` or a registry
  term flagged `standaloneScope` (not just `component`), and added SPEC-049 to
  validate the anatomy vocabulary for those non-component cases. Structured 27
  previously-fused layout tokens accordingly (bead spectrum-design-data-bzo,
  bucket 2); legacy names are unaffected.
  - **sdk/core/src/validate/rules/spec025.rs**: relaxed anchor rule.
  - **sdk/core/src/validate/rules/spec049.rs**: new rule, validates
    non-component anatomy values against `anatomy-terms.json`.
  - **packages/design-data/registry/anatomy-terms.json**: flagged
    `focus-ring`/`focus-indicator` `standaloneScope: true`.
  - **packages/design-data/components/table.json**: added `item` anatomy part.
  - **packages/design-data/registry/property-terms.json**: added `indent`.
  - **packages/design-data/tokens/layout.tokens.json**: structured
    `accessory-item-*`, `list-*`, `table-item-*`, `popover-*`, `field-width*`,
    and `focus-ring`/`focus-indicator` tokens.
  - **tools/token-mapping-analyzer/src/apply.js**: matching guard relaxation.
  - **design-data-spec**: `registry-value.json` schema + SPEC-049 rules/fixtures.

## 2.8.0

### Minor Changes

- [#1223](https://github.com/adobe/spectrum-design-data/pull/1223) [`e77c2b3`](https://github.com/adobe/spectrum-design-data/commit/e77c2b3519e75a07815c2905ac0bd0d7bef042c2) Thanks [@GarthDB](https://github.com/GarthDB)! - Add SPEC-048 to validate nested anatomy `contains` references, and populate `contains`
  for the menu, list-view, and table composite items (closes spectrum-design-data-5us).
  - **packages/design-data-spec/rules/rules.yaml**: add SPEC-048 `anatomy-contains-resolves`
    (warning) — a `contains` entry SHOULD match a sibling anatomy part's `name`.
  - **packages/design-data-spec/schemas/{anatomy-part,component}.schema.json**: update the
    `contains` field description now that it has a validation rule.
  - **packages/design-data-spec/spec/anatomy-format.md**: document the flat-vs-`contains`
    authoring convention and the new rule.
  - **sdk/core/src/validate/rules/spec048.rs**: implement the rule; register in `mod.rs`.
  - **packages/design-data/components/menu.json**: declare `menu-item`'s child parts
    (icon, label, description, value, switch, checkbox, thumbnail, drill-in-chevron,
    link-out-icon) and populate `contains`.
  - **packages/design-data/components/list-view.json**: add an `anatomy` array with
    `list-item` and its child parts.
  - **packages/design-data/components/table.json**: populate `row`'s `contains` with the
    existing `row-checkbox` part.

## 2.7.0

### Minor Changes

- [#1216](https://github.com/adobe/spectrum-design-data/pull/1216) [`c923bd2`](https://github.com/adobe/spectrum-design-data/commit/c923bd27bba0ee484ba251d9baf6a63c5cfc68d0) Thanks [@GarthDB](https://github.com/GarthDB)! - Phase D: register `space-between` property term and paired `from`/`to` endpoint fields.
  - **packages/design-data/registry/property-terms.json**: added `space-between` term for
    {a}-to-{b} spacing tokens.
  - **packages/design-data/fields/from.json, to.json**: new paired semantic fields modeling a
    space-between token's two endpoints; excluded from legacy-key catalog serialization pending
    a dedicated `naming.rs` branch (04c.2).
  - **packages/design-data-spec/schemas/token.schema.json**: declared `from`/`to` on the
    nameObject definition.
  - **packages/design-data-spec/rules/rules.yaml**: added SPEC-047 validating `from`/`to` values
    against positions, generic anatomy terms, or the referenced component's declared anatomy.

- [#1200](https://github.com/adobe/spectrum-design-data/pull/1200) [`45f2ef2`](https://github.com/adobe/spectrum-design-data/commit/45f2ef23b57b3116dce9d664bb97bf05d132d087) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(authoring): B7 — generation conformance fixtures and determinism gate
  (closes #122.7).
  - **packages/design-data-spec/conformance/generation/**: Four new lifecycle
    fixtures — `deprecated-token` (string→bool normalization + `plannedRemoval`
    drop), `renamed-token` (UUID→name `renamed` resolution), `alias-rewire`
    (`$ref`→`{name}` denormalization), `mode-set-edit` (lifecycle field hoisting
    to outer set level).
  - **sdk/core/src/lib.rs**: `generation_conformance` test module drives all six
    fixtures with byte-identical comparison and a determinism re-run gate.

### Patch Changes

- [#1204](https://github.com/adobe/spectrum-design-data/pull/1204) [`4218d6a`](https://github.com/adobe/spectrum-design-data/commit/4218d6a1694db70cb37f656cd0250e306e48912d) Thanks [@GarthDB](https://github.com/GarthDB)! - Replace opt-out SKIP const in naming.rs with opt-in `excludeFromLegacyKey`
  catalog flag (ye1.9).
  - **sdk/core/src/registry.rs**: Added `exclude_from_legacy_key: bool`
    to `FieldCatalogEntry`; absent in field JSON defaults to false (opt-in).
  - **sdk/scripts/generate-registry-data.js**: Emits the new field from
    `d.excludeFromLegacyKey` in each generated literal.
  - **sdk/core/src/naming.rs**: Deleted hardcoded `SKIP` const; walk now
    skips entries where `exclude_from_legacy_key` is true.
  - **packages/design-data/fields/**: Added `"excludeFromLegacyKey": true`
    to the 9 formerly-SKIPped fields (colorScheme, scale, contrast,
    colorFamily, scaleIndex, weight, family, style, structure).
  - **packages/design-data-spec/schemas/field.schema.json**: Added
    `excludeFromLegacyKey` boolean to allow the flag in field declarations.

## 2.6.0

### Minor Changes

- [#1184](https://github.com/adobe/spectrum-design-data/pull/1184) [`a6506b7`](https://github.com/adobe/spectrum-design-data/commit/a6506b7083587a22a62b42974a5922d053208e5f) Thanks [@GarthDB](https://github.com/GarthDB)! - Align agent-surface spec with the scheduled-promotion contract (Phase A5, RFC #625).
  - **packages/design-data-spec/spec/agent-surface.md**: reframe `write_component` from
    "deferred; no CLI subcommand" to Phase B scheduled; add `authoring-workflow.md#scheduled-
promotion` cross-references in the tool-catalog table, the NORMATIVE note, and the status
    line; note that `write_token` and `write_component` are scheduled to become MUST when
    Phase B ships.

- [#1184](https://github.com/adobe/spectrum-design-data/pull/1184) [`a6506b7`](https://github.com/adobe/spectrum-design-data/commit/a6506b7083587a22a62b42974a5922d053208e5f) Thanks [@GarthDB](https://github.com/GarthDB)! - Add per-category authoring contracts to authoring-workflow.md (Phase A2, RFC #625).
  - **packages/design-data-spec/spec/authoring-workflow.md**: expand the per-category
    authoring contracts section from a status table into six normative subsections (tokens,
    components, fields, mode sets, guidelines, registry), each specifying required-at-creation
    fields, validation gate rules, file-naming conventions, and current authoring status.

- [#1183](https://github.com/adobe/spectrum-design-data/pull/1183) [`ae94df9`](https://github.com/adobe/spectrum-design-data/commit/ae94df9f53fc4bc7d50f0b6205cb6b337f2fff6d) Thanks [@GarthDB](https://github.com/GarthDB)! - Add normative authoring-workflow spec backbone (Phase A1, RFC #625).
  - **packages/design-data-spec/spec/authoring-workflow.md**: New spec document defining the
    authoritative source contract, lifecycle operations (create / edit / deprecate / rename /
    alias-rewire / mode-set management), taxonomy-aware authoring requirement, output-generation
    obligations, and scheduled promotion of write ops from RECOMMENDED to MUST when Phase B
    foundation-corpus write tooling ships.
  - **packages/design-data-spec/spec/index.md**: Register `authoring-workflow.md` in the Scope
    list (item 16) and Normative references table.
  - **docs/rfc-coordination.md**: Update RFC #625 row — authoritative spec now linked; Phase 4
    status updated to reflect Phase A progress.

- [#1184](https://github.com/adobe/spectrum-design-data/pull/1184) [`a6506b7`](https://github.com/adobe/spectrum-design-data/commit/a6506b7083587a22a62b42974a5922d053208e5f) Thanks [@GarthDB](https://github.com/GarthDB)! - Add output-generator conformance fixtures and normative determinism contract (Phase A4, RFC #625).
  - **packages/design-data-spec/conformance/generation/flat-token/**: fixture pairing a single
    cascade flat-token input with its expected byte-identical legacy output; tests 1:1 slug
    mapping from name-object serialization.
  - **packages/design-data-spec/conformance/generation/mode-set-token/**: fixture pairing two
    cascade tokens sharing a `set_uuid` with their merged legacy `sets`-keyed expected output.
  - **packages/design-data-spec/conformance/README.md**: document the generation fixtures
    section, format, and SDK driver command.
  - **packages/design-data-spec/spec/evolution.md**: add normative output-generator determinism
    contract (byte-identical on successive runs, sorted keys, no ephemeral fields) with link to
    the generation conformance fixtures.
  - **packages/design-data-spec/scripts/check-layout.mjs**: require both generation fixture
    directories in the layout guard.

- [#1184](https://github.com/adobe/spectrum-design-data/pull/1184) [`a6506b7`](https://github.com/adobe/spectrum-design-data/commit/a6506b7083587a22a62b42974a5922d053208e5f) Thanks [@GarthDB](https://github.com/GarthDB)! - Add SPEC-043 severity schedule to taxonomy.md and fix dangling xref (Phase A3, RFC #625).
  - **packages/design-data-spec/spec/taxonomy.md**: add `### SPEC-043 severity schedule`
    subsection — documents current warning severity, the 2.0.0 graduation condition (no
    earlier than two minor versions after Phase B catalog-aware authoring ships), and the
    ≥ 90% per-domain compliance prerequisite; mirrors the SPEC-017 precedent.
  - **packages/design-data-spec/spec/authoring-workflow.md**: fix dangling cross-reference
    at line 98 — `[Taxonomy](taxonomy.md)` now resolves to the new anchor
    `taxonomy.md#spec-043-severity-schedule`.

## 2.5.0

### Minor Changes

- [#1157](https://github.com/adobe/spectrum-design-data/pull/1157) [`a23dafb`](https://github.com/adobe/spectrum-design-data/commit/a23dafb1805dac8203baba669c61085133160454) Thanks [@GarthDB](https://github.com/GarthDB)! - Add `guideline` entity — standalone design guidance document type.
  - **schemas/guideline.schema.json**: new Layer 1 schema for non-component guidance
    pages; requires `$id`, `name`, `title`, `category`, `documentBlocks`; reuses
    `document-block.schema.json` for the body.
  - **rules/rules.yaml**: SPEC-045 (`guideline-missing-purpose`, warning) and
    SPEC-046 (`guideline-related-resolves`, warning).
  - **spec/guideline-format.md**: normative spec prose for the guideline entity.
  - **spec/index.md**, **spec/dataset-layout.md**: register `guidelines/` as an
    optional dataset directory.
  - **schemas/dataset.schema.json**: add `guidelines` to declared directories/paths.

## 2.4.0

### Minor Changes

- [`e7fbcb0`](https://github.com/adobe/spectrum-design-data/commit/e7fbcb00b6afe1c1a272ed72b7ed22c08fe8e978) Thanks [@GarthDB](https://github.com/GarthDB)! - Add `guideline` entity — standalone design guidance document type.
  - **schemas/guideline.schema.json**: new Layer 1 schema for non-component guidance
    pages; requires `$id`, `name`, `title`, `category`, `documentBlocks`; reuses
    `document-block.schema.json` for the body.
  - **rules/rules.yaml**: SPEC-045 (`guideline-missing-purpose`, warning) and
    SPEC-046 (`guideline-related-resolves`, warning).
  - **spec/guideline-format.md**: normative spec prose for the guideline entity.
  - **spec/index.md**, **spec/dataset-layout.md**: register `guidelines/` as an
    optional dataset directory.
  - **schemas/dataset.schema.json**: add `guidelines` to declared directories/paths.

## 2.2.0

### Minor Changes

- [#1126](https://github.com/adobe/spectrum-design-data/pull/1126) [`60a4835`](https://github.com/adobe/spectrum-design-data/commit/60a4835e245965639a4ac89b41d2884dd63a0bbb) Thanks [@GarthDB](https://github.com/GarthDB)! - Add SPEC-043 domain-identifying fields to all 72 typography token name objects
  (closes #1125).
  - **tokens/typography.tokens.json**: add `weight` (font-weight × 6, composite × 15),
    `style` (× 2), `family` (× 4), `scaleIndex` (font-size × 36), `structure` (margin
    multipliers × 5), and `scaleIndex`+`family:cjk` (line-height × 4) — zero SPEC-043
    advisory warnings for this file.
  - **registry/scale-values.json**: add `25` entry for `font-size-25` (`scaleIndex: 25`).
  - **spec/taxonomy.md**: add `structure` row to the typography field table; broaden
    NORMATIVE SHOULD clause to all five fields accepted by SPEC-043.

## 2.1.0

### Minor Changes

- [#1118](https://github.com/adobe/spectrum-design-data/pull/1118) [`8e017b2`](https://github.com/adobe/spectrum-design-data/commit/8e017b269f243a4842ba7239731041f8e56e4360) Thanks [@GarthDB](https://github.com/GarthDB)! - Define the normative dataset-directory layout and add the SPEC-044 structural
  pre-check (closes #1114).
  - **spec/dataset-layout.md**: new normative chapter for required/optional
    directories, the discovery algorithm, and the optional root descriptor.
  - **schemas/dataset.schema.json**: new optional `dataset.json` root descriptor;
    allow `$schema` in `mode-set.schema.json`.
  - **SPEC-044** (`dataset-structure`, error): pre-check that `tokens/` holds at
    least one `*.tokens.json`; warns on empty registered optional directories.
  - **sdk**: add `check_dataset_structure`, a `validate_dataset` entry point, and a
    `validate-dataset` CLI subcommand that schema-validates the catalog directories.

## 2.0.0

### Major Changes

- [#1113](https://github.com/adobe/spectrum-design-data/pull/1113) [`e23264e`](https://github.com/adobe/spectrum-design-data/commit/e23264e681c56077b5582bf019123b941862779a) Thanks [@GarthDB](https://github.com/GarthDB)! - Consolidate Spectrum-specific design data into a single package.
  - **`@adobe/design-data-spec`**: removed `components/`, `fields/`, and `mode-sets/` directories
    and their exports. Now a pure generalized format definition (schemas, spec, rules, conformance).
    The `./components/*.json` export is no longer published — major bump because removing a
    published export is a breaking change per semver.
  - **`@adobe/spectrum-design-data`**: added `components/` (81 component declarations), `fields/`
    (24 field catalog files), and `mode-sets/` (3 mode-set instances) alongside the existing
    `tokens/`. New exports: `./components/*`, `./fields/*`, `./mode-sets/*`.

### Minor Changes

- [#1110](https://github.com/adobe/spectrum-design-data/pull/1110) [`073c22a`](https://github.com/adobe/spectrum-design-data/commit/073c22a75c27fbb44eb57eb6cb7311e294066d76) Thanks [@GarthDB](https://github.com/GarthDB)! - Migrate cascade token `$ref` aliases from name strings to UUIDs.
  - **packages/design-data/tokens/\*.tokens.json**: alias `$ref` now holds the
    target's UUID (rename-proof, cascade canonical). Legacy `packages/tokens/src`
    is unchanged — roundtrip-verify stays clean.
  - **sdk/core/src/graph.rs**: add `resolve_alias_key` (UUID-first + slug + legacy-
    name-index fallback); fix cycle-guard to key on resolved graph key; index
    `set_uuid` so set-targeted aliases resolve.
  - **sdk/core/src/migrate.rs**: emit UUID `$ref` via `global_name_to_uuid`;
    add `MigrateSummary.dangling_alias_refs` counter.
  - **sdk/core/src/legacy.rs**: denormalize UUID `$ref` → `{name}` via
    `global_uuid_to_name` so legacy output is byte-semantically identical.
  - **sdk/core/src/validate/rules/spec001–003,015,042**: route alias lookups
    through `resolve_alias_key` for correct UUID resolution.
  - **packages/tokens/schemas/token-types/alias.json**: accept `value: "{name}"`
    (legacy) or `$ref: "<uuid>"` (cascade) via `oneOf`.
  - **packages/design-data-spec/schemas/token.schema.json**, **spec/token-format.md**:
    document UUID as the cascade canonical `$ref`; activate the reserved direction.

- [#1113](https://github.com/adobe/spectrum-design-data/pull/1113) [`e23264e`](https://github.com/adobe/spectrum-design-data/commit/e23264e681c56077b5582bf019123b941862779a) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix stale `replaced_by` UUIDs and re-enable cascade token validation in CI.
  - **`packages/design-data/tokens/`**: corrected 70 deprecated tokens whose `replaced_by`
    (and co-located `$ref`) fields held legacy scale-set wrapper UUIDs that no longer exist
    in the cascade dataset. Targets are now remapped to the correct cascade-format UUIDs via
    `set_uuid` lookup + scale matching.
  - **`packages/design-data/moon.yml`**: removed `runInCI: false` from the `validate` task
    now that SPEC-010 errors are resolved.
  - **`sdk/core/src/validate/rules/spec018.rs`**: SPEC-018 now skips when no component
    catalog is loaded (empty graph), matching the intended semantics — the rule cannot
    validate component references against a catalog that was not provided.
  - **`packages/design-data-spec/conformance/invalid/SPEC-018/dataset.json`**: updated
    fixture to use a non-empty component catalog so SPEC-018 fires for the right reason
    (referenced component not in the declared catalog).

- [#1113](https://github.com/adobe/spectrum-design-data/pull/1113) [`e23264e`](https://github.com/adobe/spectrum-design-data/commit/e23264e681c56077b5582bf019123b941862779a) Thanks [@GarthDB](https://github.com/GarthDB)! - Move Spectrum registry vocabulary into spectrum-design-data; deprecate design-system-registry.
  - **@adobe/spectrum-design-data**: gains `registry/` (27 vocabulary files) with
    subpath exports (`./registry/*.json`); now the single source of truth for all Spectrum data.
  - **@adobe/design-system-registry**: reduced to a compatibility shim. Migrate imports to
    `@adobe/spectrum-design-data` — this shim will be removed in a future major version.
  - **@adobe/design-data-spec**: gains `registry-value.json` and `platform-extension.json`
    schema exports; `manifest.schema.json` `conceptOrder` enum relaxed to open `string` type
    (no longer hardcodes Spectrum's field names — configurable per field catalog).

## 1.5.0

### Minor Changes

- [#971](https://github.com/adobe/spectrum-design-data/pull/971) [`d12173a`](https://github.com/adobe/spectrum-design-data/commit/d12173abf2915df5b1dae02ef000dae769ba4b66) Thanks [@GarthDB](https://github.com/GarthDB)! - Semantic alias foundation: SPEC-042 alias-target-domain + icon-color alias pilot.
  - **SPEC-042** (`sdk/core`): alias tokens now inherit domain from their target schema.
    A color alias carrying `colorFamily` is valid when its alias chain resolves to a
    color-domain schema (`color.json`, `color-set.json`).
  - **taxonomy.md**: new "Alias / semantic token name objects" section documenting the
    alias-target-domain rule with examples.
  - **icons.json**: 20 alias tokens gain `name` — 4 hue-background, 12 hue-primary,
    3 semantic primary, 1 disabled-primary. 3 polarity tokens deferred (RFC pending).
  - **token-corpus-migrate**: alias.json dispatch + 4 new `iconColorNameForKey` patterns.

- [#969](https://github.com/adobe/spectrum-design-data/pull/969) [`ba06968`](https://github.com/adobe/spectrum-design-data/commit/ba06968226adb268600e0ed1befc9d381e7986b6) Thanks [@GarthDB](https://github.com/GarthDB)! - Typography stragglers: structured `name` on text-align and letter-spacing tokens.
  - **typography.json**: 4 tokens gain `name` — 3 `text-align-*` and 1 bare
    `letter-spacing`.
  - **design-system-registry**: add `text-align` to `property-terms.json`;
    new `alignments.json` registry (start/center/end); regenerate `registry_data.rs`.
  - **design-data-spec**: new `alignment` spec field; `taxonomy.md` updated.
  - **token-corpus-migrate**: add `alignmentNameForKey`, `letterSpacingNameForKey`,
    `lineHeightMultiplierNameForKey` (exported for future use); extend dispatch.
  - Line-height multipliers and CJK line-height deferred — SPEC-006 collision
    and SPEC-042 constraint; follow-ups tracked in beads.

### Patch Changes

- [#972](https://github.com/adobe/spectrum-design-data/pull/972) [`e9974fb`](https://github.com/adobe/spectrum-design-data/commit/e9974fb7360e849e928b31518b073996b49ecd6b) Thanks [@GarthDB](https://github.com/GarthDB)! - Move token `name` objects out of @adobe/spectrum-tokens into a new private
  @adobe/token-names sidecar package.
  - **@adobe/spectrum-tokens**: 497 inline `name` objects removed from
    color-palette.json, icons.json, typography.json. Token data otherwise identical.
  - **@adobe/token-names** (private, new): sidecar package mirroring tokens/src
    layout; depends on @adobe/spectrum-tokens via workspace:\*.
  - **sdk/core**: `TokenGraph::from_json_dir_with_names` merges sidecar names at
    ingest; existing rules unchanged. CLI gains `--names-dir` flag.
  - **token-corpus-migrate**: writes nameMap to sidecar dir, not inline to tokens.

## 1.4.0

### Minor Changes

- [#961](https://github.com/adobe/spectrum-design-data/pull/961) [`cb48b36`](https://github.com/adobe/spectrum-design-data/commit/cb48b36bc7682e790e4b7c51ca157f58150fd462) Thanks [@GarthDB](https://github.com/GarthDB)! - Add normative color, typography, and motion token taxonomies (closes issue #942).
  - **spec/taxonomy.md**: four subsections under "Token-type taxonomies" — semantic/layout
    (existing), color, typography, motion; each with a field table and serialization order.
  - **spec/token-format.md**: split semantic fields table into universal and domain-scoped.
  - **fields/**: 6 new declarations (`colorFamily`, `family`, `weight`, `style`,
    `motionRole`, `easing`) with domain `scope`; `scaleIndex` position moved to 99.
  - **registry/**: 6 new value files for color families, typography families/weights/styles,
    and motion roles/easing curves (motion entries provisional).
  - **SPEC-042** (`field-scope-violation`, warning): domain-scoped field on wrong token type.
  - **SPEC-043** (`domain-required-fields`, warning): color/typography/motion token missing
    a domain-identifying field; advisory severity, does not block the existing corpus.
  - Conformance fixtures for SPEC-042 and SPEC-043.
  - `docs/rfc-coordination.md`: RFC #806 future-taxonomies question resolved.

## 1.3.0

### Minor Changes

- [#958](https://github.com/adobe/spectrum-design-data/pull/958) [`c5bd47e`](https://github.com/adobe/spectrum-design-data/commit/c5bd47e72c59c7b4132464af6b6f39864a77704d) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(spec): add `modeSetRestrictions` to platform manifest and SPEC-041 coverage rule

  Platforms can now declare which mode values are valid in a given mode set via the optional
  `modeSetRestrictions` manifest field (e.g. iOS restricting `colorScheme` to `["light"]`).
  The cascade resolver filters restricted candidates before context matching (step 0 of the
  resolution algorithm). SPEC-041 (`mode-set-restriction-coverage`) enforces that every token
  group has at least one candidate surviving all restrictions simultaneously, and reports
  unknown mode set names and missing defaults as separate sub-diagnostics.

## 1.2.0

### Minor Changes

- [#955](https://github.com/adobe/spectrum-design-data/pull/955) [`e05c3ef`](https://github.com/adobe/spectrum-design-data/commit/e05c3eff28caecbdb9782eb62023876e0d1f4947) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(spec): property field migration path + property-terms registry (#941)

  Adds normative migration policy for the `name.property` field per RFC #806:
  - New `### Name-object migration policy` section in `spec/token-format.md` —
    documents SPEC-017 severity escalation to `error` at spec `2.0.0`, narrowed
    `property` semantics (CSS/styling attribute only), and author migration steps.
  - New `property-terms.json` registry — 35 seeded CSS/styling attribute terms
    (`color`, `background-color`, `border-radius`, `font-size`, `gap`, etc.).
  - Updated `fields/property.json` — sets `registry` path to `property-terms.json`;
    exports `propertyTerms` from registry index.
  - Updated `spec/taxonomy.md` Property row — links to migration section and
    calls out anatomy/surface values as migration debt.
  - Closed RFC #806 open question in `docs/rfc-coordination.md`.

- [#950](https://github.com/adobe/spectrum-design-data/pull/950) [`a8dacbc`](https://github.com/adobe/spectrum-design-data/commit/a8dacbc3572f4e16da518707393a22d21d73272b) Thanks [@GarthDB](https://github.com/GarthDB)! - **SPEC-040 `component-option-field-valid` (Warning, Layer 2)**: token name-object keys
  that match a declared `options.<key>` with a `values[]` list are now cross-validated
  against that list. This generalises SPEC-019 (which covers `variant` at Error severity)
  to all remaining option-enum fields — `style`, `size`, `staticColor`, and any future
  component option with a declared `values` array.

  The rule is advisory (Warning) so datasets can absorb the new check incrementally.
  Tokens using option values not yet declared in `components/*.json` will emit warnings
  rather than errors. Promotion to Error is deferred until the option catalog stabilises.

  **Migration:** if your component declares `options.style.values` and your tokens
  reference `name.style`, ensure the style values in use appear in the declared `values`
  list. The warning message identifies the token, field, and undeclared value.

## 1.1.0

### Minor Changes

- [#936](https://github.com/adobe/spectrum-design-data/pull/936) [`d387252`](https://github.com/adobe/spectrum-design-data/commit/d3872520226ffe20fb8eda1e6bfc60f2fc4f3435) Thanks [@GarthDB](https://github.com/GarthDB)! - **Spec:** Lift manifest query notation from deferred to normative (RFC #715 / SPEC-039).

  `spec/manifest.md` previously instructed implementations to treat `include`/`exclude` entries as
  opaque identifiers. That clause is now removed: each entry MUST parse as a valid query expression
  per `spec/query.md` and MUST use only the supported query keys.

  New Layer 2 rule SPEC-039 (`manifest-query-parseable`) enforces this at validation time by calling
  the same parser used by the `query` and `diff --filter` CLI subcommands. Parse failures report the
  failing entry's instance path and the query parser's error message to guide migration.

  **Migration:** If your manifest uses non-query strings in `include`/`exclude`, update them to the
  query notation defined in `spec/query.md`. The SPEC-039 diagnostic reports the exact position and
  key that failed, so running `validate` against your manifest will surface any entries that need
  updating.

## 1.0.0

### Major Changes

- [#932](https://github.com/adobe/spectrum-design-data/pull/932) [`0f256ce`](https://github.com/adobe/spectrum-design-data/commit/0f256ce0d067c87503979676d09cb4de7e904321) Thanks [@GarthDB](https://github.com/GarthDB)! - **Breaking:** Replace `optionDescriptor.enum` + `deprecatedEnumValues` with a
  structured `values` array.

  Each entry in `values` is an `optionValue` object (`{ value, description?, lifecycle? }`),
  eliminating the key-drift hazard that existed when `deprecatedEnumValues` could reference
  values absent from `enum`.

  Migration: convert `"enum": ["a", "b"]` to
  `"values": [{"value": "a"}, {"value": "b"}]`. Any `deprecatedEnumValues` entries fold into
  the matching `values[].lifecycle` object.

  SDK rules updated: SPEC-019 (`component-variant-valid`) reads `values[].value` instead of
  `enum[]`; SPEC-037 (`sub-entity-deprecation-cascade`) reads `values[].lifecycle.deprecated`
  for the option-value cascade.

## 0.15.0

### Minor Changes

- [#930](https://github.com/adobe/spectrum-design-data/pull/930) [`4e8ad86`](https://github.com/adobe/spectrum-design-data/commit/4e8ad86998b0e168396badb8a2a12207ebf535ae) Thanks [@GarthDB](https://github.com/GarthDB)! - Add SPEC-037 (`sub-entity-deprecation-cascade`) advisory rule: warn when a non-deprecated
  token references a deprecated anatomy part, deprecated component state, or deprecated
  option-enum value via its `name` object. Schemas extended to allow `lifecycle` on anatomy
  parts and states, and `deprecatedEnumValues` on option descriptors.

## 0.14.0

### Minor Changes

- [#928](https://github.com/adobe/spectrum-design-data/pull/928) [`1849738`](https://github.com/adobe/spectrum-design-data/commit/1849738b1a65d2656280aa7777d1169fcc3f036b) Thanks [@GarthDB](https://github.com/GarthDB)! - Add SPEC-036 (`component-deprecation-cascade`) advisory rule: warn when a
  non-deprecated token references a component declaration marked deprecated
  via `lifecycle.deprecated`. Closes the deprecation-cascade open question
  on rfc-coordination rows #735 / #832.

## 0.13.0

### Minor Changes

- [#924](https://github.com/adobe/spectrum-design-data/pull/924) [`20bb703`](https://github.com/adobe/spectrum-design-data/commit/20bb7035ad7d62513670bfb393b70766a295e51c) Thanks [@GarthDB](https://github.com/GarthDB)! - Expand canonical accessibility role vocabulary with `progressbar`, `meter`,
  `grid`, `listitem`, and `group` (issue #892, RFC-B Phase 7 follow-on).
  - `spec/accessibility.md` — 5 new rows added to the canonical role vocabulary
    table (21 total).
  - `spec/accessibility-adapters.md` — 5 new rows added to each platform mapping
    table (Web/ARIA, iOS, Android).
  - `components/meter.json` — `role: "meter"`, WCAG 4.1.2 added.
  - `components/progress-bar.json`, `progress-circle.json`,
    `in-field-progress-circle.json` — `role: "progressbar"`, WCAG 4.1.2 and
    4.1.3 added.
  - `components/table.json` — `role: "grid"` added.
  - `components/avatar-group.json`, `swatch-group.json`, `button-group.json` —
    `role: "group"` added.
  - `docs/rfc-coordination.md` — RFC-B open question for #892 marked resolved.

- [#924](https://github.com/adobe/spectrum-design-data/pull/924) [`20bb703`](https://github.com/adobe/spectrum-design-data/commit/20bb7035ad7d62513670bfb393b70766a295e51c) Thanks [@GarthDB](https://github.com/GarthDB)! - Close RFC #661 category validation gap: add SPEC-034 advisory rule and
  align the `data-visualization` category id across all surfaces.
  - `spec/registry.md` — marks the categories.json gap closed; SPEC-034
    is now the authoritative validator for `meta.category`.
  - `schemas/component.schema.json` — loosens `meta.category` from a
    hard-coded enum to a free-form string; SPEC-034 (warning-level) is
    the single source of validation.
  - `rules/rules.yaml` — adds SPEC-034
    (`component-category-registry-sync`, severity: warning).
  - `packages/design-system-registry/registry/categories.json` — removes
    the `"data visualization"` alias from `data-visualization`; kebab-case
    is the sole canonical form.
  - `components/table.json` — migrates `meta.category` from
    `"data visualization"` to `"data-visualization"`.
  - `docs/rfc-coordination.md` — RFC #661 open question marked resolved.
  - SDK: new `spec034.rs` rule + `categories()` accessor on `RegistryData`
    - codegen updated to embed `categories.json`.

- [#924](https://github.com/adobe/spectrum-design-data/pull/924) [`20bb703`](https://github.com/adobe/spectrum-design-data/commit/20bb7035ad7d62513670bfb393b70766a295e51c) Thanks [@GarthDB](https://github.com/GarthDB)! - Add SPEC-035 (`anatomy-part-name-registry-sync`) advisory warning rule.

  Fires when a component anatomy part's `name` is not in the `anatomy-terms.json`
  registry from `@adobe/design-system-registry`. Sibling of SPEC-034
  (`component-category-registry-sync`) for the anatomy-terms vocabulary.
  - `rules/rules.yaml` — adds SPEC-035 (severity: warning, category: naming-consistency)
  - SDK: new `spec035.rs` rule using the existing `for_field("anatomy")` accessor on
    `RegistryData`
  - `spec/anatomy-format.md` — extends SPEC rules table; adds note pointing to registry as
    authoritative vocabulary
  - `spec/registry.md` — adds SPEC-035 to the "Validated by" line for `anatomy-terms.json`
  - `docs/rfc-coordination.md` — marks anatomy-part name registry-sync gap as resolved
  - Conformance fixtures: `conformance/valid/SPEC-035/` and `conformance/invalid/SPEC-035/`

## 0.12.0

### Minor Changes

- [#921](https://github.com/adobe/spectrum-design-data/pull/921) [`b98a17d`](https://github.com/adobe/spectrum-design-data/commit/b98a17dfeaff24bf1bc17d0705c1ff9ce734f7d7) Thanks [@GarthDB](https://github.com/GarthDB)! - Expand canonical accessibility role vocabulary with `progressbar`, `meter`,
  `grid`, `listitem`, and `group` (issue #892, RFC-B Phase 7 follow-on).
  - `spec/accessibility.md` — 5 new rows added to the canonical role vocabulary
    table (21 total).
  - `spec/accessibility-adapters.md` — 5 new rows added to each platform mapping
    table (Web/ARIA, iOS, Android).
  - `components/meter.json` — `role: "meter"`, WCAG 4.1.2 added.
  - `components/progress-bar.json`, `progress-circle.json`,
    `in-field-progress-circle.json` — `role: "progressbar"`, WCAG 4.1.2 and
    4.1.3 added.
  - `components/table.json` — `role: "grid"` added.
  - `components/avatar-group.json`, `swatch-group.json`, `button-group.json` —
    `role: "group"` added.
  - `docs/rfc-coordination.md` — RFC-B open question for #892 marked resolved.

- [#923](https://github.com/adobe/spectrum-design-data/pull/923) [`f3a0a6b`](https://github.com/adobe/spectrum-design-data/commit/f3a0a6b6bc03774e870aad989c16d9b532406aaf) Thanks [@GarthDB](https://github.com/GarthDB)! - Close RFC #661 category validation gap: add SPEC-034 advisory rule and
  align the `data-visualization` category id across all surfaces.
  - `spec/registry.md` — marks the categories.json gap closed; SPEC-034
    is now the authoritative validator for `meta.category`.
  - `schemas/component.schema.json` — loosens `meta.category` from a
    hard-coded enum to a free-form string; SPEC-034 (warning-level) is
    the single source of validation.
  - `rules/rules.yaml` — adds SPEC-034
    (`component-category-registry-sync`, severity: warning).
  - `packages/design-system-registry/registry/categories.json` — removes
    the `"data visualization"` alias from `data-visualization`; kebab-case
    is the sole canonical form.
  - `components/table.json` — migrates `meta.category` from
    `"data visualization"` to `"data-visualization"`.
  - `docs/rfc-coordination.md` — RFC #661 open question marked resolved.
  - SDK: new `spec034.rs` rule + `categories()` accessor on `RegistryData`
    - codegen updated to embed `categories.json`.

## 0.11.0

### Minor Changes

- [#918](https://github.com/adobe/spectrum-design-data/pull/918) [`e77379b`](https://github.com/adobe/spectrum-design-data/commit/e77379b24b3d66b09ce78b4cf20e2d15cefbe78b) Thanks [@GarthDB](https://github.com/GarthDB)! - docs(spec): add registry.md formalizing three-registry boundary and single-package strategy

## 0.10.0

### Minor Changes

- [#889](https://github.com/adobe/spectrum-design-data/pull/889) [`8726a99`](https://github.com/adobe/spectrum-design-data/commit/8726a991f01f08e57c3545e5bb9274fab12f96b0) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(spec): accessibility.schema.json + component schema wiring (Phase 7.3)

- [#890](https://github.com/adobe/spectrum-design-data/pull/890) [`0650e39`](https://github.com/adobe/spectrum-design-data/commit/0650e39335edebfbefbadf7c39fb1cc399fa211e) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(spec): SPEC-030/031 accessibility validation rules (Phase 7.4)

- [#891](https://github.com/adobe/spectrum-design-data/pull/891) [`9932351`](https://github.com/adobe/spectrum-design-data/commit/99323513890abb3ddad93f1394c756bf56526f27) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(spec): add accessibility declarations to all foundation components (Phase 7)

## 0.9.0

### Minor Changes

- [#886](https://github.com/adobe/spectrum-design-data/pull/886) [`0710522`](https://github.com/adobe/spectrum-design-data/commit/071052225694d1442a3bdc8094f2a67f9a24277f) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(spec): accessibility vocabulary for component declarations (Phase 7.1)

## 0.8.0

### Minor Changes

- [#877](https://github.com/adobe/spectrum-design-data/pull/877) [`d0297f0`](https://github.com/adobe/spectrum-design-data/commit/d0297f0042404a4e6381009ce80849c781f8db49) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(spec): document blocks — typed prose for tokens, components, and anatomy (Phase 9)

## 0.7.0

### Minor Changes

- [#863](https://github.com/adobe/spectrum-design-data/pull/863) [`0e30511`](https://github.com/adobe/spectrum-design-data/commit/0e30511ec5ce916b76b97d116459a6421f0ddd4e) Thanks [@GarthDB](https://github.com/GarthDB)! - Phase 8.x: product context document
  - New spec chapter `spec/product-context.md` — defines the Layer 3 product context document:
    rationale, overrides, extensions, and agent capture behavior.
  - New schema `schemas/product-context.schema.json` — validates product-context.json documents.
  - `spec/cascade.md` — note on product context in the layers table.
  - `spec/manifest.md` — cross-reference to product context.
  - `spec/agent-surface.md` — add `write_token` and `write_component` to tool catalog (RECOMMENDED);
    note on rationale capture behavior.
  - `spec/index.md` — add product context to normative references.
  - `design-data write` CLI subcommand — creates or updates a product-context.json file; accepts
    `--output` (path) and `--rationale` (text) flags.

### Patch Changes

- [#863](https://github.com/adobe/spectrum-design-data/pull/863) [`0e30511`](https://github.com/adobe/spectrum-design-data/commit/0e30511ec5ce916b76b97d116459a6421f0ddd4e) Thanks [@GarthDB](https://github.com/GarthDB)! - Phase 1.x: add optional `rationale` string field to token schema
  - `schemas/token.schema.json`: add `rationale` to both `tokenWithValue` and `tokenWithRef`
    properties. Field is OPTIONAL; no validation rules.
  - `spec/token-format.md`: add `rationale` row to the lifecycle and metadata table.

## 0.6.0

### Minor Changes

- [#860](https://github.com/adobe/spectrum-design-data/pull/860) [`fd06340`](https://github.com/adobe/spectrum-design-data/commit/fd063404ebef790f37887611572a8ae1e49dc053) Thanks [@GarthDB](https://github.com/GarthDB)! - Phase 6.7: token binding declarations
  - Add optional `tokenBindings` array to component declarations (`component.schema.json`): lists
    tokens a component uses, including foundation/structure tokens not scoped to the component in
    their name-object. Each entry has a required `token` (name string) and optional `context` (Figma
    Group label).
  - Add optional `componentBindings` array to token declarations (`token.schema.json`): reverse index
    of `tokenBindings`; informative and derivable from component files.
  - Add SPEC-027 (`token-binding-token-exists`): each `tokenBindings[].token` MUST match a declared
    token name in the dataset.
  - Add conformance fixtures for SPEC-027 (`conformance/invalid/SPEC-027/`,
    `conformance/valid/token-bindings.json`).
  - Extend `spec/component-format.md` with Token bindings section and updated SPEC rules table.
  - Add `componentBindings` section to `spec/token-format.md`.
  - Update `describe_component` return shape in `spec/agent-surface.md` to include `tokenBindings`.
  - Seed `tokenBindings` on 58 component files from spec-snoop Figma extraction data.

## 0.5.0

### Minor Changes

- [#858](https://github.com/adobe/spectrum-design-data/pull/858) [`38127f5`](https://github.com/adobe/spectrum-design-data/commit/38127f556435783f31ab54c11d1ec6c93da17813) Thanks [@GarthDB](https://github.com/GarthDB)! - Phase 6.7: token binding declarations
  - Add optional `tokenBindings` array to component declarations (`component.schema.json`): lists
    tokens a component uses, including foundation/structure tokens not scoped to the component in
    their name-object. Each entry has a required `token` (name string) and optional `context` (Figma
    Group label).
  - Add optional `componentBindings` array to token declarations (`token.schema.json`): reverse index
    of `tokenBindings`; informative and derivable from component files.
  - Add SPEC-027 (`token-binding-token-exists`): each `tokenBindings[].token` MUST match a declared
    token name in the dataset.
  - Add conformance fixtures for SPEC-027 (`conformance/invalid/SPEC-027/`,
    `conformance/valid/token-bindings.json`).
  - Extend `spec/component-format.md` with Token bindings section and updated SPEC rules table.
  - Add `componentBindings` section to `spec/token-format.md`.
  - Update `describe_component` return shape in `spec/agent-surface.md` to include `tokenBindings`.
  - Seed `tokenBindings` on 58 component files from spec-snoop Figma extraction data.

## 0.4.0

### Minor Changes

- [#855](https://github.com/adobe/spectrum-design-data/pull/855) [`c9002db`](https://github.com/adobe/spectrum-design-data/commit/c9002db2da1d1bb40446b4991648dc7809a55f33) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(component-schemas): migrate source of truth to design-data-spec components

  `@adobe/spectrum-component-api-schemas` is now a thin adapter over
  `@adobe/design-data-spec/components/`. All 80 component declarations have been
  converted to the new format and live in `packages/design-data-spec/components/`.

  The API surface is unchanged: `getAllSchemas()`, `getAllSlugs()`,
  `getSchemaBySlug()`, `getSchemaFile()`, and `schemaFileNames` all behave
  identically. Returned objects now include new fields (`name`, `displayName`,
  `options`, `states`, `lifecycle`) alongside the existing aliases (`title`,
  `properties`, `slug`) — no consumer breakage.

  `@adobe/design-data-spec` minor: 79 component declarations added to
  `components/`. `optionDescriptor` in `component.schema.json` now allows
  additional JSON Schema keywords (`pattern`, `minimum`, `items`, etc.)
  to accommodate real-world component option descriptors.

## 0.3.0

### Minor Changes

- [#853](https://github.com/adobe/spectrum-design-data/pull/853) [`e4b9656`](https://github.com/adobe/spectrum-design-data/commit/e4b9656bead7b9513c9df42f30ff32b8a70d4568) Thanks [@GarthDB](https://github.com/GarthDB)! - Add Layer 2 cross-reference validator implementing SPEC-018–024, conformance fixtures,
  and a reference button component declaration. Export new component, anatomy-part, and
  state-declaration schemas from the package.

## 0.2.0

### Minor Changes

- [#837](https://github.com/adobe/spectrum-design-data/pull/837) [`29531ee`](https://github.com/adobe/spectrum-design-data/commit/29531ee2a9935922bab329c26edce1de8489a423) Thanks [@GarthDB](https://github.com/GarthDB)! - Add composite token support (Proposal 010). Introduces a `$valueType` field for
  declaring a token's value-type schema. Defines three composite value-type schemas
  (`typography`, `drop-shadow`, `typography-scale`) under `schemas/value-types/`.
  Adds inline alias reference rules and three new validation rules (SPEC-014,
  SPEC-015, SPEC-016). No breaking changes — `$valueType` is optional.

- [#837](https://github.com/adobe/spectrum-design-data/pull/837) [`29531ee`](https://github.com/adobe/spectrum-design-data/commit/29531ee2a9935922bab329c26edce1de8489a423) Thanks [@GarthDB](https://github.com/GarthDB)! - Add string-name escape hatch (Proposal 011). Allows a token's `name` to be
  a plain string when the structured taxonomy cannot express it. String-named
  tokens are schema-valid but trigger SPEC-017 (severity: warning,
  category: tech-debt), making tech debt visible and trackable. No breaking
  changes — all existing name-object tokens are unaffected.

## 0.1.1

### Patch Changes

- [#824](https://github.com/adobe/spectrum-design-data/pull/824) [`7ee19ea`](https://github.com/adobe/spectrum-design-data/commit/7ee19eae92051564f605497bd4ac4bf9a6f259fe) Thanks [@GarthDB](https://github.com/GarthDB)! - Reconcile spec with RFC discussion family.
  - Add `lastModified` lifecycle field on tokens (originally proposed in RFC #623,
    missed during initial implementation). Records the spec version when a token's
    value or non-formatting metadata last changed. Validated by new rule
    `SPEC-014: lastModified MUST NOT precede introduced`.
  - Clarify in `manifest.md` that the query notation defined in `spec/query.md` is
    normative for programmatic use; manifest `include`/`exclude` adoption is
    deferred to a post-`1.0.0-draft` revision.
  - Add a worked `card`-as-`structure`-vs-`component` example to `taxonomy.md` to
    disambiguate scope decisions.
  - Replace open-ended "additional taxonomies will be defined" sentence with a
    pointer to the open RFC discussion (#806 Q3).
  - Update legacy-format mapping table in `evolution.md` to note `lastModified`
    has no legacy equivalent.

  All changes are additive or clarifying; no token data or existing rule semantics
  change.

## 0.1.0

### Minor Changes

- [#810](https://github.com/adobe/spectrum-design-data/pull/810) [`4a55a5f`](https://github.com/adobe/spectrum-design-data/commit/4a55a5f2b027d7df73852cb62dd633bd5da17c93) Thanks [@GarthDB](https://github.com/GarthDB)! - Add taxonomy registries and expand token name object schema.
  - Split `anatomy-terms.json`: removed styling surfaces and positional terms
  - Added `token-objects.json` (background, border, edge, visual, content)
  - Added 6 new taxonomy registries:
    structures, substructures, orientations, positions, densities, shapes
  - Exported all 7 new registries from package index
  - Added all 13 semantic fields explicitly to `nameObject` in
    `token.schema.json`, distinguishing semantic from dimension fields

## 0.0.1

### Patch Changes

- [#738](https://github.com/adobe/spectrum-design-data/pull/738) [`880b365`](https://github.com/adobe/spectrum-design-data/commit/880b3650c297612b25d1b9ee1a01aa49abbacdd7) Thanks [@GarthDB](https://github.com/GarthDB)! - Add draft Design Data Specification prose (`1.0.0-draft`), v0 JSON Schemas,
  validation rule catalog (SPEC-001–SPEC-006), and conformance fixtures.
