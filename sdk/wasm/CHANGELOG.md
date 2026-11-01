# @adobe/design-data-wasm

## 0.12.0

### Minor Changes

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

- [#1584](https://github.com/adobe/spectrum-design-data/pull/1584) [`bb1c83b`](https://github.com/adobe/spectrum-design-data/commit/bb1c83b3900d17aa119da65d20f388a6d98cba75) Thanks [@GarthDB](https://github.com/GarthDB)! - Render a component through a platform's `componentAliases` and recipes.
  - `design-data render <component> --platform <id>` and `design-data site --platform <id>` look
    recipes up in the graph through `canonical_component`. An alias key such as `button` draws the
    recipe of its target (`button-ios`); `render button-ios` still works.
  - A platform's `extensions/visuals` recipes now reach `render` and `site`. Foundation recipes load
    into the graph before the platform is applied, so a platform recipe replaces them.
  - The site lists the alias key with the target's data and adds `source` and `aliasOf` to
    `data.json` under a platform. The raw alias target is hidden from the list.
  - A malformed recipe file now fails with its path.
  - WASM: `renderScene` and `renderSvg` map `request.component` through the applied platform's
    aliases. No API change; without a platform, output is unchanged.

- [#1582](https://github.com/adobe/spectrum-design-data/pull/1582) [`9b4ad35`](https://github.com/adobe/spectrum-design-data/commit/9b4ad35c29fb00193e5847625699afb04fa0c560) Thanks [@GarthDB](https://github.com/GarthDB)! - Render component visuals through a platform manifest.
  - `design-data render` and `design-data site` accept the global `--platform <id>` (or
    `DESIGN_DATA_PLATFORM` / `default_platform`) and apply the Foundation to Platform cascade
    before building scenes: tokens are filtered and overridden, and extension components,
    relationships and tokens are layered in.
  - A recipe binding that does not resolve under a platform is reported as
    `warning: platform '<id>': ...`. The site lists these in a panel instead of drawing nothing.
  - The site writes the platform into `data.json` and names it in the nav heading
    ("Foundation" when none is selected).
  - WASM: `Dataset.applyPlatform(manifest)` applies a manifest with its `extensions` merged
    inline, so `renderScene` and `renderSvg` render a platform build.
  - With no platform selected, output is unchanged.

### Patch Changes

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

- [#1582](https://github.com/adobe/spectrum-design-data/pull/1582) [`9b4ad35`](https://github.com/adobe/spectrum-design-data/commit/9b4ad35c29fb00193e5847625699afb04fa0c560) Thanks [@GarthDB](https://github.com/GarthDB)! - A box placed directly in a row now paints itself, so checkbox and switch no longer need a
  render-only `control` part.
  - Renderer and JS runtime read `fill`, `stroke` and `strokeWidth` on a flowed box.
  - Checkbox and switch drop `control`. The box and the track carry the size and hold the marks
    and the handle. Rendered geometry, colors and press scale are unchanged.
  - Relationships that named `control` now name `box` (checkbox) or `track` (switch).
  - Checkbox and switch anatomy are now reviewed.

- [#1582](https://github.com/adobe/spectrum-design-data/pull/1582) [`9b4ad35`](https://github.com/adobe/spectrum-design-data/commit/9b4ad35c29fb00193e5847625699afb04fa0c560) Thanks [@GarthDB](https://github.com/GarthDB)! - The component explorer (`design-data site`) now honors option constraints.
  - **Matrix:** combinations excluded by an `error` constraint are not rendered, and rows or columns
    left empty are dropped. A note under the grid says what was left out and why, with the fix.
    `advisory` combinations render with a footnote saying they have no distinct design.
  - **Pickers:** values that lead to an unsupported combination read "(not supported)", and a status
    message under the pickers explains the current selection, with one-click fixes.
  - **Zoom view:** an unsupported selection shows the explanation instead of a render.
  - **sdk/plugins/site:** new `constraints.js` mirrors `sdk/core/src/constraints.rs`; a shared
    fixture keeps the Rust and JS evaluations in lockstep.

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

- [#1582](https://github.com/adobe/spectrum-design-data/pull/1582) [`9b4ad35`](https://github.com/adobe/spectrum-design-data/commit/9b4ad35c29fb00193e5847625699afb04fa0c560) Thanks [@GarthDB](https://github.com/GarthDB)! - Recipe `when.options` conditions now accept an array of values, as the spec already described.
  - **sdk/core, site runtime**: an array matches when any value matches and counts as one condition.
  - **SPEC-061**: checks each element of an array condition against the option's declared values.
  - **spec**: component-visuals states that an array counts as one condition.
  - **button**: static color rules for primary and secondary share one entry with `variant: [...]`.

- [#1582](https://github.com/adobe/spectrum-design-data/pull/1582) [`9b4ad35`](https://github.com/adobe/spectrum-design-data/commit/9b4ad35c29fb00193e5847625699afb04fa0c560) Thanks [@GarthDB](https://github.com/GarthDB)! - Speed up `Dataset.renderScene` and `Dataset.renderSvg` by compiling each recipe once per
  component, size and mode and reusing it. Repeated renders are 30 to 55 times faster
  (button 6.5 to 0.21 ms, badge 5.0 to 0.11 ms, switch 7.8 to 0.14 ms). Scene and SVG output
  are unchanged.

## 0.11.3

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

## 0.11.2

### Patch Changes

- [#1561](https://github.com/adobe/spectrum-design-data/pull/1561) [`be208ce`](https://github.com/adobe/spectrum-design-data/commit/be208cef23415ab779adbc49e2fcf7c9fdeca9b1) Thanks [@GarthDB](https://github.com/GarthDB)! - Sync component content from Spectrum Hub (automated).
  - **packages/design-data/components**: 97 component schemas refreshed (was 97).

## 0.11.1

### Patch Changes

- [#1382](https://github.com/adobe/spectrum-design-data/pull/1382) [`15f371e`](https://github.com/adobe/spectrum-design-data/commit/15f371e50e2ce95a624a93152e408e1bbe8844dc) Thanks [@GarthDB](https://github.com/GarthDB)! - Add static and theme-aware transparent colors, deprecate the old ones (#1345, #1346, #1347).
  - **tokens/color-palette.tokens.json**: add `transparent-static-white-*` and
    `transparent-static-black-*` (36 tokens), plus theme-aware `transparent-neutral-*` and
    `transparent-neutral-inverse-*` (108 tokens across light, dark, wireframe). Alpha equals the
    matching `opacity-*` step and matches the S2/Web Figma library's opacity links.
  - **tokens/color-palette.tokens.json**: deprecate `transparent-white-*`, `transparent-black-*`,
    `white`, and `black` with `replacedBy` mappings from #1346. Scales don't map 1:1: 8 of the
    26 numbered tokens match exactly, the rest are approximate, and `-25` maps to `-0`.
    Legacy values are unchanged.
  - **registry/color-families.json**: register the four new color families.
  - **packages/tokens/src/color-palette.json**: regenerated legacy output; the 28 deprecated
    tokens gain `deprecated`, `deprecated_comment`, and `renamed`.
  - **@adobe/design-data-wasm**: patch bump because the embedded dataset content changed.

- [`54ee322`](https://github.com/adobe/spectrum-design-data/commit/54ee322dc2fa9c6556549597a74610c290638664) - Rebuild the embedded dataset with the pinned structure-prefixed legacy keys.
  - **packages/design-data/tokens/layout.tokens.json**: `name.legacyKey` pins change the
    dataset that `sdk/core` embeds at compile time. Generated output is unchanged.

## 0.11.0

### Minor Changes

- [#1539](https://github.com/adobe/spectrum-design-data/pull/1539) [`da64677`](https://github.com/adobe/spectrum-design-data/commit/da6467789ff0277102c4972703842fc0112e73eb) Thanks [@GarthDB](https://github.com/GarthDB)! - <!-- Copyright 2026 Adobe. All rights reserved. -->

  Project canonical tokens into legacy maps for deprecated MCP compatibility.
  - **sdk/wasm**: Add `Dataset.legacyOutput()` with embedded relationship records.
  - **tools/spectrum-design-data-mcp**: Load tokens through wasm; keep existing tool APIs.

## 0.10.4

### Patch Changes

- [#1533](https://github.com/adobe/spectrum-design-data/pull/1533) [`6375e4b`](https://github.com/adobe/spectrum-design-data/commit/6375e4b83333f51f012d8f95df35a20d8a792340) Thanks [@GarthDB](https://github.com/GarthDB)! - Ship a generated `llms.txt` with each consumer-facing package (closes #1533).
  - **package.json (10 packages)**: add `llms.txt` to the npm `files` list.
  - **llms.txt**: generated from each README and `.ai/inventory.json` by `pnpm ai:sync`.

## 0.10.3

### Patch Changes

- [#1517](https://github.com/adobe/spectrum-design-data/pull/1517) [`e693b15`](https://github.com/adobe/spectrum-design-data/commit/e693b15fb1d233b6f70aed2a85532afdf949c8eb) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix the `structure` field being silently dropped from generated legacy token
  keys, which broke five banner/list gap and padding tokens.
  - **fields/structure.json**: remove `excludeFromLegacyKey: true`; `structure`
    now participates in legacy key generation like any other field.
  - **layout.tokens.json**: regenerates `gap-horizontal`, `gap-vertical`,
    `padding-horizontal`, `padding-vertical` to `banner-gap-horizontal`,
    `banner-gap-vertical`, `banner-padding-horizontal`, `banner-padding-vertical`;
    regenerates `gap-regular` to `list-gap-regular`. The five old generic keys
    are kept as deprecated aliases (`renamed` to their corrected names) so no
    existing consumer breaks.
  - **spectrum-tokens**: `packages/tokens/src/layout.json` and the six files
    aliasing these tokens are regenerated with the corrected names.

- [#1525](https://github.com/adobe/spectrum-design-data/pull/1525) [`a0154dc`](https://github.com/adobe/spectrum-design-data/commit/a0154dc39e460942cd4ab4a755e9e76130400d5d) Thanks [@GarthDB](https://github.com/GarthDB)! - Keep embedded Hub guidance current when guideline files change.
  - **sdk/core/build.rs**: invalidate Cargo's embedded snapshot when guidelines change.
  - **sdk/wasm/moon.yml**: include guideline content and the core build script in WASM build inputs.

- [#1524](https://github.com/adobe/spectrum-design-data/pull/1524) [`ec3376f`](https://github.com/adobe/spectrum-design-data/commit/ec3376fa833f2c31dd0b2340590134b2747b00c4) Thanks [@GarthDB](https://github.com/GarthDB)! - Promote public Spectrum Hub guidance to the stable release channel.
  - **packages/design-data**: refresh component guidance and publish the Hub guideline
    corpus, including the October 1 public-site sync.
  - **sdk/wasm**: rebuild embedded guidance for MCP and JavaScript consumers.
  - **tools/s2-docs-to-document-blocks**: reject duplicate component slugs and retain
    section introductions alongside their subsections in published guidance.
  - **tools/spectrum-hub-fetcher**: fetch and merge public Hub pages for component and
    guideline syncs, reconciling obsolete slugs and category paths, preserving text
    boundaries, and decoding HTML entities before transformation.

- [#1516](https://github.com/adobe/spectrum-design-data/pull/1516) [`1cce74b`](https://github.com/adobe/spectrum-design-data/commit/1cce74b35a7ecb48302b7114cd89063604ca8440) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix standalone platform manifest loading with implementation fragments.
  - **sdk/core/src/data_source/embedded.rs**: embed fragment schemas and dependencies.
    Refresh older cached snapshot layouts.
  - **sdk/core/src/manifest.rs**: cover ejected mappings and reject invalid implementation rows.
  - **sdk/core/build.rs**, **sdk/moon.yml**: rebuild and check embedded schema changes.

  <!-- Copyright 2026 Adobe. All rights reserved. -->

## 0.10.2

### Patch Changes

- [#1519](https://github.com/adobe/spectrum-design-data/pull/1519) [`738ff48`](https://github.com/adobe/spectrum-design-data/commit/738ff487e7a858d846e998f6b370755fe5929b6b) Thanks [@GarthDB](https://github.com/GarthDB)! - Build and verify wasm artifacts before snapshot and stable publication.
  - **sdk/wasm**: check packed artifacts and isolated Node and web runtimes.
  - **release workflows**: build snapshot wasm separately and verify packages before publishing.

## 0.10.1

### Patch Changes

- [#1513](https://github.com/adobe/spectrum-design-data/pull/1513) [`b9888b8`](https://github.com/adobe/spectrum-design-data/commit/b9888b8ce9a0e4ec5b607e088942999629d5d43d) Thanks [@GarthDB](https://github.com/GarthDB)! - Add Spectrum 2 implementation metadata for components with exact verified exports.
  - **spectrum-design-data**: replace S1 mappings with verified Spectrum 2 exports.
  - **design-data-wasm**: include the updated component data in the WASM package.

## 0.10.0

### Minor Changes

- [#1500](https://github.com/adobe/spectrum-design-data/pull/1500) [`da4e7d1`](https://github.com/adobe/spectrum-design-data/commit/da4e7d14b5a35a6c1e516b54b1797425145599c0) Thanks [@GarthDB](https://github.com/GarthDB)! - Add narrowing and ambiguity metadata to property-based token resolution.
  - **resolve_token**: support component, variant, state, and colorRole narrowing while reporting
    deprecated and ambiguous matches.

### Patch Changes

- [#1502](https://github.com/adobe/spectrum-design-data/pull/1502) [`2ee9fa8`](https://github.com/adobe/spectrum-design-data/commit/2ee9fa8ccc042e00a57811477a6abdd341b13c1b) Thanks [@GarthDB](https://github.com/GarthDB)! - Clarify that component query filters are accepted for compatibility but are not
  indexed in the embedded dataset.
  - **sdk/core/src/query.rs**: exclude the unreliable component field from the
    canonical indexed-filter list.
  - **sdk/wasm/src/dataset.rs**: direct component discovery to component
    descriptions and token binding metadata.

- [#1500](https://github.com/adobe/spectrum-design-data/pull/1500) [`da4e7d1`](https://github.com/adobe/spectrum-design-data/commit/da4e7d14b5a35a6c1e516b54b1797425145599c0) Thanks [@GarthDB](https://github.com/GarthDB)! - Rebuild the embedded wasm dataset snapshot, stale since 3.1.0, to match published data 3.2.5.
  - **sdk/wasm**: rebuilt against current `packages/design-data` source, refreshing
    `embedded_cache.redb` and the `pkg/node`/`pkg/web` outputs; `primer().provenance
.designDataVersion` now reports `3.2.5`.

## 0.9.0

### Minor Changes

- [#1434](https://github.com/adobe/spectrum-design-data/pull/1434) [`47db5e9`](https://github.com/adobe/spectrum-design-data/commit/47db5e9c8069b90e7377a0096ad18fa72c86fb2c) Thanks [@GarthDB](https://github.com/GarthDB)! - Route `$ref`-backed color-set CTR tokens (e.g. `action-bar-border-color`,
  `popover-border-color`, `card-selection-background-color`) through the Figma
  variables diff's per-mode comparison instead of reporting them
  `skipped-uncovered` (closes spectrum-design-data-2god).
  - **sdk/core/src/figma/import.rs**: `diff_values`'s multi-mode routing gate
    now also accepts a variable whose design-data token is CTR/relationship-backed
    (`graph.has_relationship_record`), not only one carrying a `conceptId`/`setUuid`
    directly on its resolved record — the link a `$ref`-backed color-set CTR carries
    only on its `RelationshipRecord`, never on the resolved `TokenRecord`.

## 0.8.0

### Minor Changes

- [#1432](https://github.com/adobe/spectrum-design-data/pull/1432) [`0c2efe3`](https://github.com/adobe/spectrum-design-data/commit/0c2efe3b039cf5ee59e9dcbaa0c1fa9a59d807ee) Thanks [@GarthDB](https://github.com/GarthDB)! - Platform manifests can now declare platform-local mode sets via `extensions/mode-sets/`,
  scoped to that platform's resolution (declare-or-replace by name, same as
  `extensions/fields/`).
  - **sdk/core/src/manifest.rs**: added `mode-sets` to `CONCAT_CATEGORIES`, wiring
    per-fragment validation against `mode-set.schema.json`.
  - **sdk/core/src/graph.rs**: `apply_platform_manifest` now reads `extensions.modeSets`
    and upserts each into `graph.mode_sets` (cascade and SPEC-005 already operate on it
    generically).
  - **design-data-spec**: documented `extensions/mode-sets/` in `manifest.md` and
    `mode-sets.md` (closes spectrum-design-data-h890.24).

- [#1430](https://github.com/adobe/spectrum-design-data/pull/1430) [`d3ae6e3`](https://github.com/adobe/spectrum-design-data/commit/d3ae6e3e0a5a35223ac687a72e4b7e6580256eea) Thanks [@GarthDB](https://github.com/GarthDB)! - Load platform-manifest extensions from the sibling `extensions/` directory
  (glob-discovered, per-fragment schema-validated, merged at load time) instead of an
  inline `extensions` object, matching the Layer 1 format change in design-data-spec@4.0.0
  (closes spectrum-design-data-h890.26.6).
  - **sdk/core manifest loader (surfaced via wasm/tui)**: glob-discovers
    `extensions/{tokens,components,fields,guidelines,relationships,platform-extensions}/`,
    validates each fragment against its category schema, and merges them at load time
    (deep-merge for `tokens/`, sorted-path-order/last-wins otherwise); manifests using the
    old inline `extensions` object are now rejected (#1422, #1423).

## 0.7.0

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

## 0.6.0

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

## 0.5.0

### Minor Changes

- [#1365](https://github.com/adobe/spectrum-design-data/pull/1365) [`a7d3693`](https://github.com/adobe/spectrum-design-data/commit/a7d369357d997fa3f678225a220d26e5cb7f81ee) Thanks [@GarthDB](https://github.com/GarthDB)! - Enforce cascade type-safety on manifest overrides targeting alias-only tokens.
  - **sdk/core/src/graph.rs**: `resolve_override_targets` now resolves the shadowed
    token's value through its alias chain (`TokenRecord::resolve_leaf`) instead of
    only reading a literal `value`, so an override that changes a `$ref`-aliased
    token's value type (e.g. color → dimension) is rejected like the existing
    literal-value case, instead of silently applying.

- [#1367](https://github.com/adobe/spectrum-design-data/pull/1367) [`fdff7f5`](https://github.com/adobe/spectrum-design-data/commit/fdff7f5af05b19e61ecb6d20c87df0b77445109b) Thanks [@GarthDB](https://github.com/GarthDB)! - Add a standalone `validate-manifest` CLI subcommand (closes bead spectrum-design-data-h890.5).
  - **sdk/cli/src/main.rs**: new `validate-manifest [PATH] [--manifest FILE] [--format]`
    subcommand — validates a configured Layer 2 platform manifest (Layer 1 schema shape +
    apply-time cascade checks) with CI-friendly exit codes, without running a query.
  - **sdk/core/src/data_source/mod.rs**: `CliPathOverrides` gains a `platform_manifest`
    override so the manifest can be supplied on the command line, winning over the
    `.design-data.toml` `manifest` key.

### Patch Changes

- [#1360](https://github.com/adobe/spectrum-design-data/pull/1360) [`4b841f2`](https://github.com/adobe/spectrum-design-data/commit/4b841f2dba5089bd37f96afd6c22d98c93401f62) Thanks [@GarthDB](https://github.com/GarthDB)! - Load tokens from the resolved `[source]` for `query`/`resolve`/legacy-output-cascaded (h890.19).
  - **sdk/cli/src/main.rs**: `run_query`, `run_resolve`, and
    `run_migrate_legacy_output_cascaded` now load the dataset from
    `resolved.tokens_root` (an explicit PATH argument still wins) instead of always
    reading the raw CWD, so a `.design-data.toml` `[source]` block actually takes
    effect — matching the pattern already used by `run_primer`/`run_cache_build`.

- [#1366](https://github.com/adobe/spectrum-design-data/pull/1366) [`30a282c`](https://github.com/adobe/spectrum-design-data/commit/30a282c7c6493188cc6370e20be5eb3bd783048c) Thanks [@GarthDB](https://github.com/GarthDB)! - Ship spec schemas in the GitHub tarball so manifest Layer-1 validation runs (closes bead h890.4).
  - **sdk/core/src/data_source/fetch.rs**: `should_extract` now retains
    `packages/design-data-spec/schemas/**`, which was previously dropped during
    tarball extraction of a fetched foundation.
  - **sdk/core/src/manifest.rs**: `apply_configured` now errors when a platform
    manifest is configured but `manifest.schema.json` cannot be located, instead of
    silently skipping Layer 1 validation.
  - **sdk/core/src/data_source/embedded.rs**: the embedded fallback snapshot (used
    outside a monorepo checkout, with no fetched or local source) now also bakes in
    `manifest.schema.json`, so the new guard above doesn't newly break that path.

- [#1363](https://github.com/adobe/spectrum-design-data/pull/1363) [`01e7a9c`](https://github.com/adobe/spectrum-design-data/commit/01e7a9cce239d42167dc88fdc998c3a87413c1dd) Thanks [@GarthDB](https://github.com/GarthDB)! - Load tokens from the resolved `[source]` for `validate`/`dump-legacy-keys` (h890.20).
  - **sdk/cli/src/main.rs**: `run_validate` and `run_dump_legacy_keys` now load the
    dataset from `resolved.tokens_root` (an explicit PATH argument still wins)
    instead of always reading the raw CWD, so a `.design-data.toml` `[source]`
    block actually takes effect — matching the pattern already used by
    `run_query`/`run_resolve`/`run_migrate_legacy_output_cascaded` (h890.19).

## 0.4.5

### Patch Changes

- [#1358](https://github.com/adobe/spectrum-design-data/pull/1358) [`46a5a8b`](https://github.com/adobe/spectrum-design-data/commit/46a5a8baf54063697b476c90196adf186231654b) Thanks [@GarthDB](https://github.com/GarthDB)! - Expose legacy-name decomposition for platform-manifest tooling (closes h890.8).
  - **sdk/cli/src/main.rs**: new `decompose-legacy-name` subcommand (exposes
    `naming::parse_legacy_name`/`roundtrips`) and `dump-legacy-keys` subcommand
    (exposes `naming::extract_legacy_key` per token, undeduped) so external
    importers can resolve legacy slugs without reimplementing the algorithm.

- [#1358](https://github.com/adobe/spectrum-design-data/pull/1358) [`46a5a8b`](https://github.com/adobe/spectrum-design-data/commit/46a5a8baf54063697b476c90196adf186231654b) Thanks [@GarthDB](https://github.com/GarthDB)! - Add `migrate legacy-output-cascaded` for feeding classic-schema consumers (e.g. iOS
  tokentool) from a manifest-resolved dataset (h890.10).
  - **sdk/core/src/graph.rs**: `apply_platform_manifest` overrides now replace the
    targeted Foundation-layer record in place instead of shadowing it under a
    synthetic key, so every graph consumer (not just this new command) sees one
    deterministic record per token.
  - **sdk/cli/src/main.rs**: new `migrate legacy-output-cascaded [PATH] --output FILE`
    applies the configured platform manifest cascade before converting to legacy
    schema.
  - **sdk/core/src/legacy.rs**: new `convert_records` entry point converts an
    already-cascaded in-memory array; `build_mode_entry`'s `$schema` fallback for
    schema-less override records now matches alias-ness instead of copying an
    unrelated sibling's schema, and no longer matches the token being processed.

- [#1356](https://github.com/adobe/spectrum-design-data/pull/1356) [`33225fb`](https://github.com/adobe/spectrum-design-data/commit/33225fb76a313247bcd054a6ef21eb6dbeb7ebbc) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix manifest overrides silently no-oping when targeted by a token's legacy slug.
  - **sdk/core/src/graph.rs**: `resolve_override_targets` now resolves non-query
    `target` values through `resolve_alias_key` (uuid → graph key → legacy-name
    index) instead of a partial uuid/direct-key-only lookup, so overrides written
    against legacy names (e.g. `blue-100`) actually apply.

## 0.4.4

### Patch Changes

- [#1285](https://github.com/adobe/spectrum-design-data/pull/1285) [`7652ef9`](https://github.com/adobe/spectrum-design-data/commit/7652ef92131342c3c2b8c3c1f3371f31ddc62fa8) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix `nameObject`/`raw`/`value` serializing as a JS `Map`, rendered as `{}` by
  `JSON.stringify`.
  - **sdk/wasm/src/types.rs**: added `#[tsify(hashmap_as_object)]` to the
    wasm-boundary result types so nested JSON fields cross as plain objects.

## 0.4.3

### Patch Changes

- [#1284](https://github.com/adobe/spectrum-design-data/pull/1284) [`6acda22`](https://github.com/adobe/spectrum-design-data/commit/6acda2204f29884a09760076357ddd89954889f5) Thanks [@GarthDB](https://github.com/GarthDB)! - Fixed `Dataset.suggest()` returning raw `"<file>:<index>"` graph keys as
  `tokenName` for cascade-format tokens instead of the readable legacy name,
  since it skipped the `display_name()` derivation every other surface (diff,
  TUI wizard) already uses.
  - **sdk/wasm/src/types.rs**: `SuggestResult::from` now derives `token_name`
    via `SuggestionResult::display_name()`.

## 0.4.2

### Patch Changes

- [#1271](https://github.com/adobe/spectrum-design-data/pull/1271) [`df80f34`](https://github.com/adobe/spectrum-design-data/commit/df80f347baa0a9ae056804232228ae9fe3e55fae) Thanks [@GarthDB](https://github.com/GarthDB)! - Fixes a packaging bug where the `@adobe/design-data-wasm` npm tarball omitted
  the nested `pkg/node/package.json` and `pkg/web/package.json` files. Without
  them, Node's ESM/CJS module-type resolution incorrectly inherited
  `"type": "module"` from the wasm package root, causing every real consumer's
  `import("@adobe/design-data-wasm")` to crash with `ENOENT: no such file or
directory, open './design_data_wasm_bg.wasm'`. The previously published
  `0.4.0` is permanently broken and unusable — this releases a fixed version and
  republishes the two dependents against it.
  - **@adobe/design-data-wasm**: fix the `files` allowlist to include the
    per-target `package.json` manifests.
  - **@adobe/design-data-agent-mcp**: bump `@adobe/design-data-wasm` dependency
    to the fixed version.
  - **@adobe/design-data**: bump `@adobe/design-data-wasm` dependency to the
    fixed version.

## 0.4.0

### Minor Changes

- [#1147](https://github.com/adobe/spectrum-design-data/pull/1147) [`cece05d`](https://github.com/adobe/spectrum-design-data/commit/cece05de03dd8b43cfeb697d045eb4302a34b26c) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix set-level alias resolution in `resolve_reference` after cache reload.
  - **`sdk/core/src/graph.rs`**: add `set_uuid_index` (set_uuid → all children) populated in
    all graph builders and `rebuild_uuid_index`; add `resolve_set_in_context` and
    `resolve_alias_in_context` for context-aware chain walking through set-level UUID aliases.
  - **`sdk/core/src/cascade.rs`**: extract `resolve_reference(graph, slug, ctx)` as a
    testable core function with deterministic tie-breaking and graceful dangling-ref handling.
  - **`sdk/wasm/src/dataset.rs`**: delegate `resolveReference` to the core function;
    remove spike-status comment.
  - **`packages/design-data-spec/conformance/reference/`**: 4 new fixture-driven
    conformance cases (set-alias-light, set-alias-dark, dangling-ref, unknown-slug).
  - **`sdk/wasm/test/parity.test.js`**: 7 new parity tests (wireframe, scale, set-alias
    regression, dangling-ref degradation, stable tie-break).
  - **`docs/s2-tokens-viewer/scripts/resolve.mjs`**: remove JS fallback (now redundant);
    `wasm: 9062 | fallback: 0 | missing: 0`.

## 0.3.0

### Minor Changes

- [#1143](https://github.com/adobe/spectrum-design-data/pull/1143) [`f829426`](https://github.com/adobe/spectrum-design-data/commit/f8294264fdcc5905a8d33dbdde391d8d452597b6) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(sdk): expose Dataset.suggest() on wasm surface; swap MCP suggest to wasm.
  - **sdk/wasm/src/types.rs**: add `SuggestResult` DTO (camelCase tsify) and
    `SuggestResultArray` wrapper; `From<SuggestionResult>` conversion.
  - **sdk/wasm/src/dataset.rs**: add `Dataset.suggest(intent, propertyHint, limit)`
    binding over `design_data_core::suggest::suggest` — Jaccard scoring in-process,
    no full token allocation on the JS side.
  - **tools/design-data-mcp**: replace `ds.query("") + scoreTokensByKeyword` with
    `ds.suggest(intent, undefined, limit)`; remove dead `scoreTokensByKeyword` export.
    Output shape changes to the richer Rust shape (`tokenName`, `file`, `layer`,
    `nameObject`, `value`, `confidence`, `tokenUuid`).

## 0.2.0

### Minor Changes

- [#1141](https://github.com/adobe/spectrum-design-data/pull/1141) [`87f07af`](https://github.com/adobe/spectrum-design-data/commit/87f07af51cfdaa80788e943cd948232d78e6cfd7) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(sdk): expose Dataset.suggest() on wasm surface; swap MCP suggest to wasm.
  - **sdk/wasm/src/types.rs**: add `SuggestResult` DTO (camelCase tsify) and
    `SuggestResultArray` wrapper; `From<SuggestionResult>` conversion.
  - **sdk/wasm/src/dataset.rs**: add `Dataset.suggest(intent, propertyHint, limit)`
    binding over `design_data_core::suggest::suggest` — Jaccard scoring in-process,
    no full token allocation on the JS side.
  - **tools/design-data-mcp**: replace `ds.query("") + scoreTokensByKeyword` with
    `ds.suggest(intent, undefined, limit)`; remove dead `scoreTokensByKeyword` export.
    Output shape changes to the richer Rust shape (`tokenName`, `file`, `layer`,
    `nameObject`, `value`, `confidence`, `tokenUuid`).

## 0.1.0

### Minor Changes

- [#1138](https://github.com/adobe/spectrum-design-data/pull/1138) [`a393c71`](https://github.com/adobe/spectrum-design-data/commit/a393c7132af49b92852e88b2632451f61a1e67bb) Thanks [@GarthDB](https://github.com/GarthDB)! - Extract portable domain logic from cli/tui/wasm into core; fix wasm resolve bug.
  - **wasm Dataset::resolve()**: delegates to `cascade::resolve_property`, fixing a
    latent bug where Platform-layer overrides did not beat Foundation tokens.
  - **core::authoring::draft**: `derive_token_key_from_parts` unifies TUI and MCP key
    assembly under one rule and fallback.
  - **core::component** (new): `validate_id`, `lookup`, `list` for disk-backed
    component lookup; feeds MCP `describe_component`.
  - **core::write**: `build_product_context_doc`, `merge_product_context_rationale`,
    `layer_target_filename`.
  - **core::cascade**: `parse_resolve_context`, `apply_restrictions`.
  - **core::graph**: `TokenGraph::infer_schema_url`.
  - **core::query**: `subsequence_score` (from TUI fuzzy.rs).
  - **core::validate**: `validate_catalog_dir`, `validate_catalog_schemas`.
  - **core::figma::mapping**: `summarize_variables`, `CollectionSummary`.

- [#1138](https://github.com/adobe/spectrum-design-data/pull/1138) [`a393c71`](https://github.com/adobe/spectrum-design-data/commit/a393c7132af49b92852e88b2632451f61a1e67bb) Thanks [@GarthDB](https://github.com/GarthDB)! - Add `Dataset.primer()` to the wasm surface with full parity to the CLI payload.
  - **sdk/core/src/primer.rs** (new): shared `build()`, `PrimerData` structs, `SPEC_VERSION`.
    CLI and wasm now share primer assembly — no duplication.
  - **sdk/core/src/graph.rs**: `TokenGraph` gains `fields: Vec<FieldRecord>` and
    `manifest: serde_json::Value`; new `load_spec_fields()` and `with_fields()` helpers.
  - **sdk/core/src/cache/mod.rs**: schema v3 — new `FIELDS` ordinal table and `manifest`
    META key so fields and manifest survive blob round-trips.
  - **sdk/wasm/src/dataset.rs**: `Dataset.primer()` returns the standard primer shape
    `{ specVersion, tokenCount, modeSets, components, taxonomyFields, manifest, provenance }`.
  - **sdk/wasm/moon.yml**: `cache-build` adds `--fields-path` so embedded blob carries fields.

## 0.0.2

### Patch Changes

- [#1132](https://github.com/adobe/spectrum-design-data/pull/1132) [`9571455`](https://github.com/adobe/spectrum-design-data/commit/95714559f7598a74eb76513283ffc0ce9ec7d3fe) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix CI and apply post-review cleanups to `@adobe/design-data-wasm`.
  - **sdk/wasm/moon.yml**: add `local: true` to `cache-build` so moon CI skips it;
    the task is manual-only (embedded feature is disabled by default).
  - **.github/workflows/ci.yml**: use `dtolnay/rust-toolchain@1.88.0` tag form — removes
    the redundant `toolchain:` input and makes the pinned version self-evident.
  - **sdk/wasm/src/registry.rs**, **dataset.rs**: simplify `map_err(|e| js_err(e))` →
    `map_err(js_err)` at nine call sites.
  - **sdk/wasm/src/dataset.rs** (`resolve`): add NOTE comment on per-call sub-graph clone.
  - **sdk/wasm/src/types.rs** (`ValidationResult::from`): clarify intentional double-filter
    of `ValidationReport.errors` for error vs. warning split.
  - **sdk/wasm/README.md**: document that the `default` export condition resolves to the
    web build, requiring `await init()` in Deno/Bun and non-standard bundlers.
  - **sdk/wasm/test/parity.test.js**: add two tests asserting `fromTokens` throws on
    non-array input (plain object, string) rather than panicking.
  - **sdk/wasm/LICENSE**: correct appendix copyright to `Copyright 2026 Adobe` — matches
    the Apache-2.0 canonical template and Adobe's own OSS convention (e.g. react-spectrum).
