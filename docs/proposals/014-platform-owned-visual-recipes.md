# Proposal 014: Platform-owned visual recipes (iOS Button)

**Status:** Approved, revision 4. No code, schema or recipe changes come with this document.\
**Bead:** `spectrum-design-data-p6ga.8.7` (epic `p6ga.8`). Feeds `p6ga.8.6` (iOS Button data).\
**Affects:** `platforms/<id>/extensions/`, `sdk/core` (manifest, graph, validate), `sdk/cli` (render, site), `sdk/wasm`, `sdk/plugins/site`, spec chapters `component-visuals.md`, `manifest.md`, `artifact-moves.md`.

**Why a proposal and not a spec chapter.** The decisions below change three normative chapters and three crates. Reviewers need the options and the trade-offs in one place first. After approval, the accepted parts move into the spec chapters (see [Follow-up beads](#follow-up-beads)), and this file stays as the record.

## Decisions

Revision 4 is the approved version. It records the review answers: alias, direct token binding as a scoped exception, the stopgap token import, `s/m/l` sizes, an alias that does not reach `query`, templating after the first slice, and the check of the disabled and Primary colors.

| #   | Question           | Recommendation                                                                                                                                                                                                                                                                                                                                                                                            |
| --- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Location           | `<extensionsDir>/visuals/<component>.json`, one recipe per file, the file name equals `component`. Layer 1 reuses `component-visual.schema.json` as is; no new fragment schema.                                                                                                                                                                                                                           |
| D2  | Precedence         | A platform recipe **replaces** the foundation recipe of the same component name, whole file. No layering in v1 ([reasoning](#d2-precedence-replace-or-layer)).                                                                                                                                                                                                                                            |
| D3  | Component identity | The iOS Button is a new component, `button-ios`, and the iOS manifest declares a **component alias** `button` to `button-ios`. The alias applies where someone **asks to see** a component (`render`, `site`, WASM render, recipe lookup), not where they **inspect data** (`query`, `validate`, `diff`, `export`).                                                                                       |
| D4  | Validation         | SPEC-060..075 run over platform-owned recipes against the platform-merged graph. SPEC-076 keeps its foundation-diff meaning for unreplaced foundation recipes. New SPEC-079: a platform-owned recipe renders without diagnostics, a **warning for one minor version**, then an error. SPEC-080: replacement notice. SPEC-081: alias check.                                                                |
| D5  | Loading            | `render` and `site` read recipes from `graph.visuals` (foundation layer, then platform layer). WASM needs no API change in slice 1. `ResolvedData.visuals` waits until the first external platform needs it.                                                                                                                                                                                              |
| D6  | Format work        | Slice 1 needs **no** recipe-schema or renderer change. Selector templating for any option (`{style}` next to `{size}`) is the **first follow-up (F14)** and **must land before a third style is added**. Pressed scale, opacity, gradients and materials are separate, ordered steps.                                                                                                                     |
| D7  | iOS bindings       | A platform-owned component's recipe **may bind platform tokens directly** (`token` selectors). Scoped exception to the binding standard: platform-owned components only, SPEC-079 keeps checking that every token resolves, and the recipe size is measured per added style.                                                                                                                              |
| D8  | Scale              | No restriction of the iOS `scale`. iOS tokens carry no `scale` key, so they resolve under every scale; iPadOS and macOS scales arrive through p6ga.8.4.                                                                                                                                                                                                                                                   |
| D9  | Sizes and tokens   | Option values `s/m/l`, the foundation vocabulary. The stopgap button tokens use **decomposed name objects** (`component`, `size`, `variant`, `property`) with the tokentool name as `legacyKey`. Option-to-field map: `size` fills `size`, `style` fills `variant` ([table](#option-to-field-map)). When the stopgap tokens are replaced, `button-ios-stopgap.tokens.json` is deleted in the same change. |
| D10 | First slice        | `button-ios` (alias `button`), styles Primary and Accent with **explicit per-style entries**, size Medium, states default, hover, down, disabled, light and dark, rendered by `design-data render button --platform ios`. Lines per added style are recorded.                                                                                                                                             |

## Background: what the code does today

Facts checked in the source, and one experiment.

1. `build_extensions_value` (`sdk/core/src/manifest.rs:304`) accepts only the subdirectories `tokens`, the concat categories (`components`, `fields`, `guidelines`, `platform-extensions`, `implementations`), `relationships` and `mode-sets`. Any other subdirectory, including `visuals`, is a manifest error.
2. `load_visual_env` (`sdk/cli/src/main.rs:1015`) applies the manifest cascade, then returns a **directory** (`--visuals-path`, or a `visuals/` next to the tokens or components). `render` (`run_render`, line 1120) and `site` (`write_site`, `sdk/plugins/site/src/lib.rs:65`) then read `<dir>/<component>.json` from disk. The graph is not consulted for recipes. The `apply_configured` result, which holds the mode-set restrictions, is dropped.
3. `validate` loads recipes into `graph.visuals` from `--visuals-path` only (`sdk/core/src/validate/mod.rs:176`). SPEC-060..075 run against the **foundation** graph. SPEC-076 clones the graph, applies the manifest, and reports only diagnostics that appear under the platform and not on the foundation (`sdk/core/src/validate/rules/spec076.rs:113-133`). It skips a recipe whose component is not in the foundation graph (`component_of`, line 119).
4. `extensions/components` is add-or-replace by name and replaces the whole declaration (`graph.rs`, step 5). `extensions/relationships` can add, or override and remove by `uuid`; only 1 of the 329 `button` relationships has a `uuid`.
5. The embedded dataset in WASM carries no manifests and no recipes. `renderScene(recipe, request)` takes the recipe from the caller. `applyPlatform` ignores fields it does not know, so `extensions.visuals` is ignored today.

**Experiment (throwaway, no repo files changed).** I copied the five foundation recipes to `$TMPDIR/opencode/p6ga.8.7/visuals/` and added a recipe for `tab-bar-ios`, the only platform-only component in `platforms/ios`. Results:

* `design-data validate ... --platform ios --visuals-path <that dir>` reports `SPEC-060 error: Visual recipe references undeclared component 'tab-bar-ios'`, with and without `--platform`, and **zero** SPEC-076 diagnostics. A platform-only recipe is invisible to SPEC-076 and wrongly fails SPEC-060, because the rules never see the platform's components.
* `design-data render tab-bar-ios --platform ios --visuals-path <that dir>` loads the platform component and reaches the recipe (it fails only on my fixture's missing `sizeScale`). So **render** already sees platform components; **validate** does not.
* The earlier spike (p6ga.8.5) found `render switch|button --platform ios` byte-identical to the foundation over 448 and 768 renders. That is expected: nothing in the platform can change a recipe.

## D1. Where a platform recipe lives

**Options**

* A. `<extensionsDir>/visuals/<component>.json`. One recipe per file, as `components/` and `relationships/` do. Honors `extensionsDir`. Ships with `platform eject` for free.
* B. A top-level `visualsDir` manifest field. More freedom, a second path to resolve, and the same ejection work again.
* C. Inline `recipes` in `manifest.json`. Rejected by the existing decision to keep the manifest small and the extensions as files (`manifest.md`, "extensions/ directory").

**Recommendation: A.** Register `visuals` as a known subdirectory. Discovery is the existing recursive `*.json` glob in sorted path order; the later file wins on a duplicate component name.

**Layer 1.** Each fragment validates against the existing `component-visual.schema.json` (it is already a single-object schema with `component`, `root`, `parts`). A new fragment schema would only copy it. The one extra check a schema cannot make is that the **file name equals `component`**. Make it a load error, like the other fragment errors, so `render` and `site` can find recipes by name without reading every file twice.

**Trade-off.** Reusing one schema means a platform recipe and a foundation recipe are the same format. That is the point (a promoted recipe is a file move), and it also means a platform cannot extend the recipe format by itself. New props (D6) are spec changes.

## D2. Precedence: replace or layer

**Options**

* A. **Replace.** For a component name, the platform recipe is the only recipe under that platform. Foundation stays the default when the platform has none.
* B. **Layer.** The platform recipe is a patch (per part, per prop) over the foundation recipe.

**Recommendation: A, whole file.** Three reasons.

1. Resolution is not local. Among several matching entries on one prop, the renderer picks the one with the most conditions, then the later entry, with `priority` first (`component-visuals.md`, "Value sources"). A patch that adds one entry to a foundation prop changes which entry wins for requests the author never looked at. A patch that removes an entry needs a key the entries do not have.
2. It matches `extensions/components`, which is already add-or-replace by name. One rule, two artifacts.
3. A promoted recipe is a file move (see [Promote and demote](#promote-and-demote)). A patch would have to be rewritten into a whole recipe first.

**What replace means**

| Artifact      | Effect of replacing a recipe                                                                                                                                                                                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tokens        | None. A recipe holds no token values. Its selectors resolve against the platform-cascaded graph, so platform overrides and extension tokens apply as before.                                                                                                                                     |
| Relationships | None to the relationship set. The replacing recipe binds through the **platform-merged** relationships scoped to its own component (D3).                                                                                                                                                         |
| Anatomy       | The recipe may use only anatomy parts the **platform-merged** component declares (SPEC-060). Anatomy stays platform-neutral: it names parts, not looks (`anatomy-format.md`). A platform that needs a different part set declares a different component (D3), it does not bend the foundation's. |

**Cost, and my view on layering (asked in review).** A platform that changes one prop must copy the whole recipe, and the copy can drift. I recommend replace-only for v1, because the first platform recipes are not copies: `button-ios` is a different component (D3), and the iOS switch is a different design (p6ga.8.20). Nothing has yet needed "the foundation recipe with one change". Layering would add a patch language and non-local precedence for a case no one has. **Revisit when either happens:** a platform copies more than about 80% of a foundation recipe to change one or two props, or two platforms copy the same one. Layering would then be its own proposal. Until then SPEC-080 tells reviewers which foundation recipe a platform recipe replaced, so drift is at least visible.

## D3. Component identity: replace `button`, add `button-ios`, or both

**Options**

* A. **Replace** the foundation `button` declaration under `--platform ios` (same name, different options).
* B. **New component** `button-ios`, reachable only by that name.
* C. B plus a manifest-level **alias** that makes the name `button` resolve to `button-ios` under that platform.

**Findings that rule out A**

* **Relationships do not follow a replacement.** `extensions/components` replaces the declaration, but the 329 relationships scoped to `button` stay in the graph. They pin options (`variant`, `style: fill|outline`) the iOS component no longer declares, and 328 of them cannot be removed because they have no `uuid`.
* **Tokens validate against the declaration.** Foundation tokens carry `name.component = button` and an anatomy part that SPEC-020 checks against the declared anatomy. A replaced anatomy orphans them in the platform graph.
* **The option models disagree.** Foundation `variant` (accent, negative, primary, secondary) x `style` (fill, outline) against iOS `style` (Quiet, Quiet subdued, Secondary, Primary, Accent, Negative, Premium, AI). One name with two meanings makes every cross-platform tool ambiguous.

**Recommendation: C (reviewer's choice).** The component keeps its own identity, `button-ios`, as `tab-bar-ios` does. Its recipe, relationships, anatomy and `implementations` row (Swift `SPButton`) are scoped to that name. The alias is a separate, thin layer.

**Alias design**

* **Where.** A top-level manifest field `componentAliases`, a map from a foundation component name to a component the platform declares: `{ "button": "button-ios" }`. It joins the capability matrix in `manifest.md` as "Alias a foundation component name to a platform component". It is a Layer 1 schema addition to `manifest.schema.json`; a manifest stays small and declarative, like `namingExceptions`.
* **What it does.** `TokenGraph` keeps the map and offers one lookup, `canonical_component(name)`. Every lookup that takes a user-facing component name calls it: the `render` argument, `site`, the WASM render request, and recipe lookup. The graph keeps **both** `button` and `button-ios`. Relationships, tokens and anatomy keep their real component names, so nothing in D2's list changes.
* **What it does not do.** It never rewrites a token, a relationship scope, a recipe file name or a diagnostic. Diagnostics name the canonical component (`button-ios`) and may add "(alias `button`)".
* **Site.** Under the platform, the list shows `button` with the `button-ios` recipe and data, and `aliasOf: "button-ios"` and `source: "platform"` in `data.json`. The raw target `button-ios` is hidden from the site list, but `render button-ios --platform ios` still works. A platform-only component lists under its own name with `source: "platform"`. Without a platform, `data.json` is unchanged.
* **Validation (new SPEC-081, error).** The key MUST be a foundation component; the target MUST be declared by the platform's `extensions/components`; no alias chains or cycles; the key MUST NOT also be replaced by an `extensions/components/<key>.json` (that would be two answers for one name).
* **Promote and demote.** An alias is manifest data, not an artifact. If `button-ios` is later unified into the foundation `button`, the alias and the component are removed together in the same change.

**Trade-off.** The alias adds a manifest field, a graph lookup and one rule. Keeping it out of `query` also keeps the list of call sites short (render, site, WASM, recipe lookup). In return `render button --platform ios` means what a user expects, and the data stays clean. One cost to accept: the p6ga.8.5 check "render button is byte-identical with and without `--platform ios`" no longer holds for iOS. Keep it for `react-spectrum` and `web-components`, and for `render button` **without** a platform.

**Documentation.** No iOS Button page exists on spectrum.adobe.com, so `meta.documentationUrl` is omitted. Do not invent one.

**Replacement stays available for recipes.** D2 lets a platform replace the recipe of a component it does **not** redeclare. The future iOS switch (p6ga.8.20) can do this: the foundation `switch` declaration stays, only the look changes. That works only when the options, states and anatomy still fit, which SPEC-060 and SPEC-061 check.

## D4. Validation

**Today** (see Background): rules see the foundation graph only, and SPEC-076 skips platform-only recipes.

**Proposal**

1. `validate --platform <id>` builds one platform graph (clone, apply the manifest, as SPEC-076 already does). Its recipe set is the foundation set with platform recipes replacing same-name entries. Each `VisualRecord` gains a `layer` (as `ComponentRecord` has).
2. SPEC-060..075 run a second time over the **platform-owned** records only (foundation records were checked in the first pass) against the platform graph's components, relationships and tokens.
3. SPEC-076 is unchanged for foundation recipes the platform did **not** replace.
4. Three new rules (the third, SPEC-081, checks the alias in D3).

| Rule     | Severity            | Checks                                                                                                                                                                                                                                                            |
| -------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SPEC-079 | Warning, then error | `platform-recipe-resolves`. A platform-owned recipe renders over the request grid with **no** scene diagnostic. No foundation comparison: a replaced or platform-only recipe has nothing to diff against, so the foundation-diff test of SPEC-076 does not apply. |
| SPEC-080 | Info                | `platform-recipe-replaces-foundation`. The platform recipe replaces the foundation recipe `<name>`. Reports the pair so a reviewer can see copies that may drift.                                                                                                 |

Load errors, not Layer 2 rules: file name differs from `component`; unknown `extensions` subdirectory (already an error).

Rule ids 079 to 081 are provisional (077 and 078 are reserved by [Artifact moves](../../packages/design-data-spec/spec/artifact-moves.md#detecting-a-half-finished-move)); SPEC-076 is the last id in `rules.yaml` today.

**Severity of SPEC-079.** A **warning for one minor version**, then an error (review decision). `rules.yaml` records the planned promotion. A platform recipe is new, so it should start clean, but the warning period lets the first platform recipes land while the renderer gaps (D6) close. `validate-platform-recipes.mjs` fails on SPEC-079 regardless of severity, so CI never lets a gap through; the period only affects the exit code of a plain `validate`.

**Request grid.** SPEC-076 hard-codes `light`/`dark` and `desktop`/`mobile`. For SPEC-079 start with the same grid: iOS Layout tokens carry no `scale` key, so they resolve under both (D8). When iPadOS or macOS scales exist, the grid must come from the platform's mode sets (F12).

**CI.** `.github/scripts/validate-platform-recipes.mjs` filters on SPEC-076. Extend it to SPEC-079. The moon task already hashes `/platforms/**/*`.

## D5. Loading across entry points

| Entry point              | Today                                                   | Proposed                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------ | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core manifest load       | No `visuals` subdirectory                               | `visuals` becomes a known subdirectory; fragments are collected into `extensions.visuals`. `apply_platform_manifest` upserts them into `graph.visuals` by component with `layer: Platform` and the fragment path as `file`.                                                                                                                                                                                                         |
| `render`, `site`         | Read `<visuals_dir>/<component>.json`                   | `load_visual_env` loads the foundation recipes into `graph.visuals` **before** `apply_configured`, so the platform layer lands on top. `render` and `site` resolve the name with `canonical_component` (D3) and look the recipe up in the graph. `--visuals-path` keeps meaning "the foundation recipe directory"; platform recipes still win over it.                                                                              |
| `validate`               | `--visuals-path` only                                   | As D4. Platform recipes come from the manifest, not from a flag.                                                                                                                                                                                                                                                                                                                                                                    |
| WASM `applyPlatform`     | Ignores `extensions.visuals`                            | The embedded dataset has no recipes, and `renderScene` already takes the recipe as an argument, so the caller who holds the merged manifest passes `manifest.extensions.visuals[...]`. First slice: no API change, add a test that a platform-only component renders through `applyPlatform`. Optional later: register the recipes and add a `recipes()` getter.                                                                    |
| Site `data.json`         | One entry per component; heading hard-coded (p6ga.8.13) | Build `compiled` and `byName` from the effective recipe. Add `source: "foundation" or "platform"` and, for an alias, `aliasOf` per recipe so the UI can label it. The platform id and name are already in `data.platform`.                                                                                                                                                                                                          |
| Ejected or external repo | Paths come from `.design-data.toml`                     | Fragments resolve from the manifest location (`manifest parent + extensionsDir`), the same as every other category, so nothing points into the foundation checkout (h890.22). A platform-only recipe therefore works in an external repo as is. Foundation recipes for non-replaced components would need a `visuals` entry in `ResolvedData`, which does not exist today; **deferred** until the first external platform needs it. |

**Note on `file`.** `load_and_concat` drops the source path. Platform components get `file = manifest.json` today. For recipes the diagnostics should name the fragment, so the loader must carry the path (an in-memory field, not written to disk, like `overriddenBy`).

### Promote and demote

`artifact-moves.md` lists token, component, mode set and relationship. Add **recipe**: its identity is the component name, it has no `uuid`, and it moves by file between `platforms/<id>/extensions/visuals/` and `packages/design-data/visuals/`. Promotion of a platform recipe of a **platform-only component** moves the component, its relationships and its recipe together. Step 5 ("Verify") already runs `validate --platform <id> --visuals-path`; with D4 it also covers the platform-owned recipes.

## D6. What the iOS Button needs from the format and the renderer

Facts from the iOS Figma file (`OQExiy8bX0pRqee71eAWX6`, Button page 2752:1131; component set `3956:67276`, variant properties `Enabled`, `Size`, `Style`, `Icon capsule`, `Show text`), the Swift package (`~/Spectrum/spectrum-ios`, `Sources/SpectrumComponents/Button`) and the token package (`~/Spectrum/spectrum-tokens-ios`):

* Medium: height 39, corner radius 20, horizontal padding 14, vertical padding 8 (node `3956:67377`).
* Premium fill is a linear gradient with stops at 0, 0.66 and 1, from the top left to the bottom right (node `3956:67389`).
* The `Material` child has opacity 0 on Accent and Premium; it is visible on Quiet (`3956:67377`). So materials do not change the Primary and Accent renders.
* Pressed: `ButtonInteraction.swift` has `pressedScale: 0.94` and also `hoverScale: 1.045`. Styles pass no pressed color, so pressed uses the hover color (`SPButtonStyle.swift`; gradients at lines 253-282).
* Hover is pointer-only (iPadOS): `SPButtonHoverStyle.swift`, `SPUIButton.swift:303-312`.
* Focus has a slot in `SPComponentStateFill` but no Button code sets it, and the Figma file has no focus variant.
* **iOS binds tokens by name, per size and style.** `SPButtonLayout.swift` reads `.buttonMdHPadding`, `.buttonMdVPadding`, `.buttonMdHGap` and so on; `SPButtonStyle.swift` reads `.accentBackgroundColorDefault`, `.accentBackgroundColorHover`, `.disabledBackgroundColor`. There is no relationship layer. The tokens are **generated** by `spectrum-tokens-ios` (`Tools/tokentool`): web token data (version 13.0.0 in its README) plus values converted from the iOS Figma variable collections (`ios-tokens/override-log.csv` lines 92 to 100 list `button-md-h-padding` 14, `button-md-v-padding` 8, `button-md-h-gap` 6, `button-md-radius-capsule` 20, `button-lg-radius-capsule` 28). The Figma Layout collection is the source; the Swift enums are the output.

**What this means for tokens (decision D7).** The iOS team does not need web-style tokens and relationships. It needs the named values its code already uses. The iOS data has one relationship record today (the `tab-bar-ios` one), and the Swift code binds tokens by name. The standing binding standard (2026-10-29: recipes bind through relationships by default; a direct selector needs a reason) already allows a token selector "with a reason". The reason here is real, so I recommend a **scoped** exception:

1. It applies to **platform-owned components** only (a component declared by a platform manifest, such as `button-ios`). Foundation components stay relationship-first.
2. SPEC-079 keeps checking that every token the recipe names resolves, so a direct binding cannot hide a missing token.
3. The recipe size is watched. Relationship-first is what shrank the badge recipe from 1,896 to about 290 lines, because the option-to-token mapping lives in the data. With direct tokens that mapping lives in the recipe, and the iOS Button has 8 styles, several states and 3 modes. Three things keep it small: the stopgap tokens follow a regular pattern that selectors can template (`{style}`, `{size}`; see the option-to-field map); the slice **measures** the lines each added style costs; and templating (F14) **must land before a third style**. If the iOS token names do not follow a pattern, the fallback is iOS relationships that carry the option-to-token mapping.

The spec text (`component-visuals.md`, authoring convention 1) and the `visual-recipe-binding-standard` note record the exception.

Consequences: SPEC-067 (a token selector duplicates a relationship binding) cannot fire for `button-ios`, because it has no relationships. SPEC-071 (unbound relationship contexts) has nothing to count. SPEC-062 still checks that each selector matches a token.

**Selector templating (not in the first slice).** Today a selector string may contain `{size}` and `{sizeIndex}` only. Generalizing it to `{<option>}` for any declared option (for example `{style}`) would make adding a style a data change. It needs no schema change, but it touches `visual.rs`, the compiled-recipe step, `visual-runtime.js`, the parity test and the spec sentence in "Value sources". Review decision: **ship the first slice without it**, with explicit per-style entries for Primary and Accent; record the recipe lines each style adds; make templating (F14) the first follow-up. **Gate: F14 must land before a third style is added**, so the recipe never grows past two explicit styles. The line-count target and the eight-style projection stay in the slice.

**Update (2026-11-01, p6ga.8.46):** templating now lands **before the second style**, not before the third. Measured with the proposal's recipe shape: explicit per-style entries cost 144, 197 and 250 lines for one, two and three styles (515 for eight), while the templated recipe is 128 lines for any number. Templating is already shorter at one style, so writing two explicit styles and rewriting them is wasted work.

**Recorded recipe size (2026-11-01, p6ga.8.40).** `platforms/ios/extensions/visuals/button-ios.json` binds through `{size}` and `{style}` and is **121 lines** (Prettier format) with Accent only, **121 lines** with Accent and Primary, and **121 lines** for eight styles: a style adds zero recipe lines when its tokens follow the `{style}` pattern. Checked by adding a throwaway `negative` style (one component option value and its tokens, recipe file unchanged) in a scratch copy and rendering it. A style's cost is its component option value and its tokens, not recipe lines. Two corrections to the sketch above: disabled is selected with `"options": {"isDisabled": true}`, because a recipe `states` condition matches only the request's interaction states (`hover`, `down`), and down binds the real `down` tokens rather than the hover token. The label font and icon size are left out until iOS tokens exist for them, and the renderer does not draw `paddingBlockStart` or `paddingBlockEnd`, so the container height stays the renderer default (32) until it does.

**Needs, in order**

| Step | Need                                                       | Today's format?                                                                                                                                       | Work                                                                                                                                                                 | Bead                         |
| ---- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 0    | Platform-owned recipe, component and alias (this proposal) | No                                                                                                                                                    | D1 to D5                                                                                                                                                             | new                          |
| 1    | iOS Button tokens (Layout and color)                       | **Data.**                                                                                                                                             | A small stopgap file in `platforms/ios/extensions/tokens/` (see the [worked example](#worked-example-ios-button)), without a `scale` key. Coordinate with m2xm.2.    | p6ga.8.25, p6ga.8.15, m2xm.2 |
| 1.5  | Selector templating for any option (`{style}`)             | **No.** Only `{size}` and `{sizeIndex}`.                                                                                                              | `visual.rs`, compiled recipes, `visual-runtime.js`, parity test, spec sentence. No schema change. **First follow-up; must land before a third style.**               | F14                          |
| 1    | Capsule radius                                             | **Yes.** Bind `button-{size}-radius-capsule` (20 for Medium). The `relativeTo: "height"` ratio is not needed.                                         | Data only.                                                                                                                                                           | in slice                     |
| 1    | Pressed color = hover color                                | **Yes.** A `down` entry that binds the hover token.                                                                                                   | Data only.                                                                                                                                                           | in slice                     |
| 1    | Accent label white in every mode                           | **Yes.** One entry, `style: accent`, binding the white palette token.                                                                                 | Data only (p6ga.8.26).                                                                                                                                               | p6ga.8.26                    |
| 1    | iOS state names                                            | **Yes.** Recipes use foundation state names. iOS terms (`highlighted`, `focused`) live in `extensions/platform-extensions/ios-states.json`.           | `button-ios` declares `hover`, `down`, `disabled` and no `focus`. Pointer-only hover is documentation on the state, not a render rule. The mapping work is p6ga.8.4. | p6ga.8.4                     |
| 2    | Pressed scale 0.94                                         | **No.** The recipe models press as a CSS perspective (`pressDifference`, `pressWidthRatio`, `pressMinPerspective`, `pressMaxPerspective`).            | Add a direct `pressScale` prop (schema, `visual.rs`, `visual-runtime.js`; parity test). Hover scale 1.045 is out of scope.                                           | new                          |
| 2    | Opacity (disabled dims instead of recoloring)              | **Partly.** `opacity` is in the schema, but the scene has no opacity and the renderer ignores the prop silently (no match in `visual.rs`; p6ga.8.22). | Implement `opacity` in the scene and both backends; make an unsupported prop a diagnostic, not a silent skip.                                                        | p6ga.8.22                    |
| 3    | Premium and AI gradients                                   | **No.** `fill` is one color string.                                                                                                                   | New value source (stops as token refs, angle), scene `fill` as string or gradient, SVG, `visual-runtime.js`, compiled recipes, Figma backend.                        | p6ga.8.23                    |
| 4    | Quiet and Quiet subdued with materials                     | **No.** No blur or vibrancy concept.                                                                                                                  | Decide approximate (flat fill) against a declared platform-only anatomy part. Anatomy stays neutral, so name the part by role, not by the Apple term.                | p6ga.8.24                    |
| 5    | Contrast, Dark Elevated, iPadOS and macOS scales           | **No.** The request has no contrast axis and no platform scale mapping.                                                                               | p6ga.8.4, 8.8, 8.31. Not needed for light and dark.                                                                                                                  | p6ga.8.4/.8/.31              |

**Out of scope for the first slice:** steps 2 to 5, hover scale, Secondary and Negative (plausible with today's format; add after the slice), icon capsule geometry, the switch.

## Worked example: iOS Button

Paths are in `platforms/ios/` and are **proposed**, not created. Placeholders in angle brackets are filled in during the slice.

```text
platforms/ios/
  manifest.json                              # adds componentAliases
  extensions/
    components/button-ios.json               # new component declaration
    tokens/button-ios-stopgap.tokens.json    # provisional button tokens (see below)
    visuals/button-ios.json                  # new recipe (this proposal)
    implementations/button-ios.json          # SPButton row
```

There is no `extensions/relationships/button-ios.json` (D7).

**Manifest** (the addition only):

```json
{ "componentAliases": { "button": "button-ios" } }
```

**Component** (abridged; every declared option and state needs a recipe use or a `notVisual` entry, SPEC-066). Sizes use the foundation vocabulary (D9):

```json
{
  "name": "button-ios",
  "displayName": "Button (iOS)",
  "options": {
    "style": {
      "type": "string",
      "default": "accent",
      "values": [{ "value": "primary" }, { "value": "accent" }]
    },
    "size": {
      "type": "string",
      "default": "m",
      "values": [{ "value": "s" }, { "value": "m" }, { "value": "l" }]
    },
    "isDisabled": { "type": "boolean", "default": false },
    "isLabelHidden": { "type": "boolean", "default": false }
  },
  "states": [
    { "name": "hover", "trigger": "interaction", "precedence": 50 },
    { "name": "down", "trigger": "interaction", "precedence": 55 },
    { "name": "disabled", "trigger": "prop", "precedence": 100 }
  ],
  "anatomy": [
    { "name": "container", "required": true, "contains": ["icon", "label"] },
    { "name": "icon" },
    { "name": "label", "required": true }
  ]
}
```

The slice lists only the styles it draws. The final declaration (Quiet, Quiet subdued, Secondary, Negative, Premium, AI, icon capsule) is p6ga.8.6.

### The stopgap tokens

The review asked to compare **resolved RGBA per state and mode**, not token names. Method: Figma variables from `GET /v1/files/OQExiy8bX0pRqee71eAWX6/variables/local` with alias chains resolved per mode; the iOS graph from `design-data query ... --platform ios --format dtcg --color-scheme light|dark`; and the iOS token package's `ios-tokens/override-log.csv`.

**Why the disabled tokens "did not resolve" in my first check.** That was my query error, not a missing token. I passed the alias **target** uuid as a `uuid` filter (it matches a token's own uuid only), and filtered `property=disabled-background-color`, but the foundation token is decomposed (`property: color`, `state: ["disabled"]`, `object: background`, with `legacyKey: "disabled-background-color"`), and `legacyKey` is not a query key. Querying `state=disabled` finds them. **The foundation tokens exist, so no foundation-gap bead is needed.**

| Need                      | Figma iOS (light / dark)                      | iOS graph today (light / dark)                                   | Verdict                                                                                                                                              |
| ------------------------- | --------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accent fill, default      | `#3b63fb` / `#4069fd`                         | `#3b63fb` / `#4069fd`                                            | Equal. Alias, do not import.                                                                                                                         |
| Accent fill, hover, down  | `#274dea` / `#345bf8`                         | `#274dea` / `#345bf8`                                            | Equal. Alias, do not import.                                                                                                                         |
| Accent label              | `Palette/white`: `#ffffff` / `#ffffff`        | foundation white palette                                         | Equal. Alias.                                                                                                                                        |
| Disabled fill             | `rgba(0,0,0,0.03)` / `rgba(255,255,255,0.07)` | `#e9e9e9` / `#2c2c2c` (opaque)                                   | **Genuine difference.** The iOS token package overrides the same-named token (`override-log.csv` line 209: old 233 and 44, new alpha 0.03 and 0.07). |
| Disabled content          | `rgba(0,0,0,0.22)` / `rgba(255,255,255,0.28)` | `#c6c6c6` / `#444444` (opaque)                                   | **Genuine difference.** `override-log.csv` line 211: old 198 and 68, new alpha 0.22 and 0.28.                                                        |
| Primary fill, default     | `rgba(0,0,0,0.84)` / `rgba(255,255,255,0.85)` | `#292929` / `#dbdbdb` (`neutral-background-color-default`)       | **Differs as RGBA** (alpha below 1). On the base surface it composites to about `#292929` and `#d9d9d9`, within two levels of the opaque value.      |
| Primary fill, hover, down | `rgba(0,0,0,0.93)` / `rgba(255,255,255,0.94)` | `#131313` / `#f2f2f2` (`neutral-background-color-hover`, `down`) | **Differs as RGBA**, same pattern.                                                                                                                   |
| Primary label             | `rgba(255,255,255,1)` / `rgba(0,0,0,1)`       | not checked per state                                            | Check in the slice (the foundation primary label is a different role).                                                                               |

How to read it. The Primary and disabled fills are **translucent** in iOS and **opaque** in the foundation. The two agree on the base surface and diverge on any other surface (a tinted background, an elevated level). That is the genuine difference, so the slice imports the Figma values and does not alias the foundation's opaque stand-in. The Swift code has **no** `inverted` token (zero matches in `override-log.csv`) and no public Primary style (p6ga.8.5), so the Primary values are Figma-only; the stopgap `description` says so.

**One question the check raises (F17).** For disabled, iOS overrides a **foundation token by name** for every component, not only the button. The cascade has a mechanism for that: manifest `overrides` by uuid. The review asked for stopgap tokens, so the slice adds component-scoped `button-ios` disabled tokens. A platform-wide `overrides` entry would change the disabled color of every iOS component, which is the iOS truth but a wider change. Decide in F17 whether to move to overrides; until then the stopgap stays component-scoped.

**What the import is.** The **12 Layout tokens** (`button/{sm,md,lg}/h-padding`, `v-padding`, `h-gap`, `radius-capsule`: padding 10/14/18 and 5/8/16, gap 6, capsule radius 15/20/28; none are in `platforms/ios`, p6ga.8.25), the **Primary** fill and label tokens, and the **disabled** fill and content tokens. Skip the deprecated Figma names (`🚫 radius`, `🚫 icon-only-*`), `button/trailing-list/*`, and the high-contrast values (p6ga.8.4). Accent and white are aliases.

**Naming convention.** The existing imported iOS tokens use one flat `property` string plus fields (`property: "accent-background-color"`, `state`, `contrast`). The foundation uses decomposed fields. The stopgap uses **decomposed fields scoped to the component**, with the tokentool name kept as `legacyKey`:

```json
{
  "name": {
    "component": "button-ios",
    "size": "m",
    "property": "h-padding",
    "legacyKey": "button-md-h-padding"
  },
  "$schema": "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/dimension.json",
  "value": "14px",
  "description": "Stopgap for p6ga.8.7. Figma Layout button/md/h-padding.",
  "uuid": "<new uuid>"
}
```

```json
{
  "name": {
    "component": "button-ios",
    "variant": "primary",
    "property": "background-color",
    "state": ["hover"],
    "colorScheme": "light"
  },
  "value": "rgba(0, 0, 0, 0.93)",
  "description": "Stopgap for p6ga.8.7. Figma Alias/background/inverted/hover. Figma only: Swift has no Primary style.",
  "uuid": "<new uuid>"
}
```

**Replacement rule (also on the m2xm.2 note).** Decomposed and flat names do **not** shadow each other: a flat `button-md-h-padding` token and the decomposed stopgap token are two different keys, and both would resolve. So when a later import replaces the stopgap tokens, **`button-ios-stopgap.tokens.json` is deleted in the same change**, and the recipe selectors change in that change if the naming differs. The stopgap file is therefore not "replaced by name"; it is removed. Note on ownership: m2xm.2 is currently a **trial into a scratch manifest** that "never writes `platforms/ios`", and no bead applies an import to `platforms/ios`. The rule is attached to whichever change first imports these Layout tokens into `platforms/ios`, and the note on m2xm.2 says so; m2xm.5 (ownership) decides who that is.

**Marked as a stopgap.** The file is `button-ios-stopgap.tokens.json`, each token's `description` says so, and every token has a `uuid`.

#### Option-to-field map

A selector never has a hidden mapping: the recipe writes the field name, and the option value fills it. This table is the contract, so option names and name-field names cannot drift apart. It is checked against `registry/variants.json`, `registry/sizes.json` and the field declarations.

| Option (`button-ios`) | Fills name field | Registry              | Values in the registry                                                                                                                      |
| --------------------- | ---------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `size`                | `size`           | `sizes.json`          | `s`, `m`, `l`: all present.                                                                                                                 |
| `style`               | `variant`        | `variants.json`       | `accent`, `primary`, `negative`, `secondary`, `quiet`, `subdued`: present. **`premium`, `ai`, `quiet-subdued`: not in the registry** (F18). |
| (fixed in the recipe) | `component`      | `components.json`     | `button-ios` is not registered (advisory validation, F18).                                                                                  |
| (fixed in the recipe) | `property`       | `property-terms.json` | `background-color`, `content-color` present; `h-padding`, `v-padding`, `h-gap`, `radius-capsule` are not (advisory, F18).                   |

Two facts to keep in mind. The `variant` field is documented as the "primary color or semantic variant" and says "not for visual style treatment, see `style`", but the `style` field is scoped to typography (italic, oblique), so neither field fits a button style exactly. I recommend `variant`, because the foundation `button` already uses its `variant` option for accent, negative, primary and secondary, and its tokens carry the same `variant` field. Validation of these fields is advisory (warnings), not an error. The slice runs `validate` and lists the advisory warnings; each becomes a registry addition (F18) or an accepted note.

**Recipe** (abridged). Slice 1 uses **explicit per-style entries**. Size is templated (`{size}` already exists); style is not. Each added style adds one fill entry per state, one label entry, and nothing else:

```json
{
  "specVersion": "1.0.0-draft",
  "component": "button-ios",
  "root": "container",
  "sizeScale": { "s": 75, "m": 100, "l": 200 },
  "parts": {
    "container": {
      "kind": "box",
      "children": ["icon", "label"],
      "props": {
        "paddingInlineStart": {
          "token": {
            "component": "button-ios",
            "size": "{size}",
            "property": "h-padding"
          }
        },
        "paddingInlineEnd": {
          "token": {
            "component": "button-ios",
            "size": "{size}",
            "property": "h-padding"
          }
        },
        "paddingBlockStart": {
          "token": {
            "component": "button-ios",
            "size": "{size}",
            "property": "v-padding"
          }
        },
        "paddingBlockEnd": {
          "token": {
            "component": "button-ios",
            "size": "{size}",
            "property": "v-padding"
          }
        },
        "gap": {
          "token": {
            "component": "button-ios",
            "size": "{size}",
            "property": "h-gap"
          }
        },
        "cornerRadius": {
          "token": {
            "component": "button-ios",
            "size": "{size}",
            "property": "radius-capsule"
          }
        },
        "fill": [
          {
            "when": { "options": { "style": "accent" } },
            "token": {
              "component": "button-ios",
              "variant": "accent",
              "property": "background-color",
              "state": "default"
            }
          },
          {
            "when": { "options": { "style": "accent" }, "states": ["hover"] },
            "token": {
              "component": "button-ios",
              "variant": "accent",
              "property": "background-color",
              "state": "hover"
            }
          },
          {
            "when": { "options": { "style": "accent" }, "states": ["down"] },
            "token": {
              "component": "button-ios",
              "variant": "accent",
              "property": "background-color",
              "state": "hover"
            }
          },
          {
            "when": { "options": { "style": "primary" } },
            "token": {
              "component": "button-ios",
              "variant": "primary",
              "property": "background-color",
              "state": "default"
            }
          },
          {
            "when": { "options": { "style": "primary" }, "states": ["hover"] },
            "token": {
              "component": "button-ios",
              "variant": "primary",
              "property": "background-color",
              "state": "hover"
            }
          },
          {
            "when": { "options": { "style": "primary" }, "states": ["down"] },
            "token": {
              "component": "button-ios",
              "variant": "primary",
              "property": "background-color",
              "state": "hover"
            }
          },
          {
            "when": { "states": ["disabled"] },
            "priority": 10,
            "token": {
              "component": "button-ios",
              "property": "background-color",
              "state": "disabled"
            }
          }
        ]
      }
    },
    "label": {
      "kind": "text",
      "props": {
        "color": [
          {
            "when": { "options": { "style": "accent" } },
            "token": {
              "component": "button-ios",
              "variant": "accent",
              "property": "content-color"
            }
          },
          {
            "when": { "options": { "style": "primary" } },
            "token": {
              "component": "button-ios",
              "variant": "primary",
              "property": "content-color"
            }
          },
          {
            "when": { "states": ["disabled"] },
            "priority": 10,
            "token": {
              "component": "button-ios",
              "property": "content-color",
              "state": "disabled"
            }
          }
        ]
      }
    }
  }
}
```

`sizeScale` is required by the renderer today (a recipe without an entry for the requested size fails with "recipe has no sizeScale entry for size", seen in the experiment); its numbers are unused because the selectors use `{size}`. The `down` entry binds the hover token because the Swift styles pass no pressed color; the iOS data also has an `accent-background-color-pressed` token with the same value, which the code does not use. With templating (F14), the six per-style fill entries and two label entries collapse to three fill entries and one label entry, and a new style adds tokens and one option value only.

## Slice 1: the smallest end-to-end proof

**Scope.** The D1 to D5 loading and validation work, the alias (D3), the stopgap button tokens (D9), and `button-ios` with styles Primary and Accent (explicit per-style entries), size Medium, states default, hover, down (color only) and disabled, light and dark. Scale is not fixed (D8). **No renderer change**: selector templating is F14, the first follow-up.

**Acceptance criteria**

1. `platforms/ios/extensions/visuals/button-ios.json` passes Layer 1 and the file-name check; a copy named `other.json` is a load error.
2. `design-data render button --platform ios --size m --color-scheme light|dark` draws the iOS Button with no diagnostics for Primary and Accent in default, hover, down and disabled, and the output is identical to `render button-ios --platform ios`. `--size s|m|l` all work.
3. Resolved colors match Figma per state and mode: Accent fill `#3b63fb` and `#4069fd` (default), `#274dea` and `#345bf8` (hover and down); Accent label white; Primary fill `rgba(0,0,0,0.84)` and `rgba(255,255,255,0.85)` (default) and `0.93` and `0.94` (hover and down); disabled `rgba(0,0,0,0.03)` and `rgba(255,255,255,0.07)`. Medium height is 39 and radius 20 (Figma `3956:67377` and `3956:67381`). The Primary label is checked against `Alias/content/neutral-inverted/default`.
4. `--scale desktop` and `--scale mobile` give the same scene for `button-ios` (the tokens carry no `scale` key). This is the check that D8 holds.
5. Down renders the hover color. Disabled is drawn, or listed in `notVisual` with a bead.
6. **Recipe size per style is recorded.** The line count of `button-ios.json` with Accent only, and with Accent and Primary, is recorded on the bead, giving the lines each style adds. The target is about 150 lines or fewer for two styles. The bead also records the projection for eight styles (lines per style times eight, plus the fixed part). If the projection is more than about 400 lines, F14 is promoted before any further style work. **Gate: F14 (templating) lands before a third style is added.**
7. The stopgap file has the 12 Layout tokens plus the Primary and disabled tokens from the table above; every token has a `uuid`, a stopgap `description` and no `scale` key. `validate` reports no error for them, and the advisory warnings are listed (F18). A note on m2xm.2 lists what was imported and the naming convention, states the replacement rule (delete `button-ios-stopgap.tokens.json` in the same change as the replacing import), and notes that m2xm.2 is a scratch trial that does not write `platforms/ios`.
8. `render button` **without** `--platform` is unchanged. `render button --platform react-spectrum` and `--platform web-components` stay byte-identical to the foundation. `query --filter component=button --platform ios` returns the foundation records and prints the alias hint.
9. `design-data validate --platform ios --visuals-path ...` runs SPEC-060..075 on the recipe and reports no SPEC-060 error for `button-ios`. A recipe with a missing token produces SPEC-079 as a warning. A platform-owned recipe with the same name as a foundation recipe produces SPEC-080. A bad alias (unknown target, cycle, replaced key) produces SPEC-081.
10. `node .github/scripts/validate-platform-recipes.mjs` passes for `ios`, `react-spectrum` and `web-components`; it fails on SPEC-079 even though that rule is a warning.
11. `design-data site --platform ios` lists one Button entry with `source: "platform"` and `aliasOf: "button"` and renders it; the foundation `button` entry is not shown for that platform and is unchanged without a platform.
12. WASM: a test builds a dataset, calls `applyPlatform` with the merged manifest (including the alias), and renders the iOS Button with the platform recipe.
13. A snapshot test covers the platform recipe under `--platform ios`; no existing snapshot hash changes.
14. `pnpm exec prettier --check`, the repo lint, `moon run sdk:test` and `git diff pnpm-lock.yaml` (empty).

## Risks and unknowns

1. **Scale is not settled.** iOS will likely need iPadOS and, later, macOS scales (reviewer). D8 avoids a premature restriction, but it only works while iOS Layout tokens carry no `scale` key. When iPad or Mac values differ, p6ga.8.4 (platform scale mapping) must add the axis, and SPEC-079's grid must read the platform's mode sets rather than the constants SPEC-076 uses.
2. **Mode restrictions are dropped.** `load_visual_env` discards the `apply_configured` result, so a `modeSetRestrictions` entry in any manifest has no effect on `render` or `site`. Separate bug; not needed for slice 1.
3. **Token source of truth.** iOS values are generated from the iOS Figma variable collections by `spectrum-tokens-ios` (tokentool, web token data 13.0.0 plus overrides). The manifest tokens in `platforms/ios` are a second copy, and the stopgap is a third, tiny one. They can drift from the Swift enums. The stopgap cites `override-log.csv` and the Figma variables for each value, and is deleted in the change that imports the Layout tokens. Do not author a fourth source.
4. **Binding-standard exception (D7).** Approved as a scoped exception (platform-owned components only, SPEC-079 keeps checking, recipe size measured per added style). The risk is recipe growth: relationship-first shrank the badge recipe from 1,896 to about 290 lines because the mapping lives in the data. The slice ships explicit per-style entries, so the cost is measured, not guessed; F14 templating must land before a third style, and if iOS token names do not follow a pattern templating can use, the fallback is iOS relationships that carry the mapping.
5. **Token naming and registry.** Decided: decomposed fields (`component`, `size`, `variant`, `property`) with the tokentool name as `legacyKey`. The registry lacks the style values `premium`, `ai` and `quiet-subdued` and the property terms `h-padding`, `v-padding`, `h-gap`, `radius-capsule`; validation is advisory, but the vocabulary should be added (F18) before those styles land. If a later import chooses flat `property` strings, the stopgap file is deleted in the same change and the recipe selectors change with it.
6. **Exporter grouping caveat (p6ga.8.32).** The Figma exporter groups records by `(file, key)` in `sdk/plugins/figma/src/mapping/graph.rs`, and an extension record with a different file can replace a whole foundation variable. The site builds its `figma` names from `export_tokens(graph)` of the platform graph, so a recipe that binds one of the three affected tokens (`color-loupe-inner-border` and the two floating-action-button shadow colors) could show a wrong Figma name. The iOS Button does not bind them. New button tokens are added under new names, so they do not collide with foundation keys. Check again when p6ga.8.32 resolves.
7. **Modes (p6ga.8.4, 8.8, 8.31).** Slice 1 needs only light and dark. Increased contrast differs from the base mode in about 335 iOS variables, far more than Dark Elevated (10, none used by the button). A recipe that wants `modes: {colorScheme: dark-elevated}` depends on p6ga.8.8 and p6ga.8.31.
8. **Silent unsupported props.** `opacity` is accepted by the schema and ignored by the renderer. A recipe that relies on it would look right in review and wrong when rendered. Make unsupported props a diagnostic before the first recipe that uses one (p6ga.8.22).
9. **Copy drift on replacement** (D2). A replaced foundation recipe is a copy. SPEC-080 shows it; nothing detects divergence.
10. **Alias reach.** The alias applies to `render`, `site`, WASM render and recipe lookup only, not to `query`, `validate`, `diff` or `export`. A missed render-side call site gives "unknown component" under `--platform ios`; list the call sites in F3 and test each entry point. `query` prints a one-line hint when it names an aliased component.
11. **Option vocabulary.** `button-ios.style` reuses the name of the foundation option `style` with different values. `size` uses `s/m/l`, the foundation vocabulary, so `--size m` and the platform picker (p6ga.8.13) keep their meaning. The token `variant` field carries the style value; cross-component tools key on `(component, option)`.
12. **Hover scale.** Swift scales on hover (1.045); Figma does not show it. Not modeled.
13. **WASM and site parity.** Any `pressScale`, `opacity` or gradient addition touches `visual.rs`, `visual-runtime.js` and the parity test together. WASM is published; each step needs a changeset.
14. **External platform repos (deferred).** An ejected repo has no foundation `visuals/` unless the foundation source provides one, and `ResolvedData` has no `visuals` field. Per review, add it when the first external platform needs it. Platform fragments already resolve from the manifest location, so a platform-only recipe works without it.
15. **m2xm.2 is scratch-only.** m2xm.2 is a trial into a scratch manifest that never writes `platforms/ios`, and no bead imports its output there. The replacement rule for the stopgap tokens needs an owner; m2xm.5 (ownership) is the place to settle it.
16. **Disabled colors are a platform-wide override in iOS.** The Swift tokens override the same-named foundation token for every component. The slice keeps them component-scoped (review decision); F17 decides whether to use manifest `overrides` instead.
17. **Tab bar.** `tab-bar-ios` has no anatomy and no recipe, and neither the iOS repo nor the Figma file has a tab bar. Whether to retire it is a p6ga.8.6 decision; this proposal does not depend on it.

## Review answers and what remains

| Question                    | Answer                                                                                                                                                                                                          |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name under `--platform ios` | Alias `button` to `button-ios` (D3).                                                                                                                                                                            |
| Direct token binding        | Yes, as a scoped exception (D7). Recorded in the spec text and the memory note.                                                                                                                                 |
| Selector templating         | **Not in the first slice.** Explicit per-style entries for Primary and Accent; lines per added style recorded; F14 is the first follow-up and must land before a third style (D6).                              |
| Primary and disabled colors | Compared as resolved RGBA per state and mode. Disabled tokens **do exist** in the foundation (my first query was wrong); iOS genuinely differs (alpha). Primary differs as RGBA. Import both as stopgap tokens. |
| Naming                      | Decomposed fields with `legacyKey`; the stopgap file is deleted in the same change that replaces it (D9). Option-to-field map in the worked example.                                                            |
| Option values               | `s/m/l` (D9).                                                                                                                                                                                                   |
| `query --component`         | Does not honor the alias; prints a hint (D3).                                                                                                                                                                   |
| SPEC-079 severity           | Warning for one minor version, then an error (D4).                                                                                                                                                              |
| iOS scale                   | No restriction (D8).                                                                                                                                                                                            |
| Layering                    | Replace-only for v1 (D2).                                                                                                                                                                                       |
| `ResolvedData.visuals`      | Deferred (risk 14).                                                                                                                                                                                             |

**Decisions deferred to follow-up beads, not blockers for slice 1**

1. **Disabled colors: overrides or stopgap tokens** (F17).
2. **Registry vocabulary** for `premium`, `ai`, `quiet-subdued` and the layout property terms (F18).
3. **Owner for replacing the stopgap tokens** (m2xm.5).

## Follow-up beads

Proposed only; not filed. Each is one finding, parent `p6ga.8`, in the qkj5 style (labels `layer:*`, `kind:*`, `disp:*`).

| #   | Title                                                                                                                                                                                                                                                                             | Labels                                                     | Depends on           |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | -------------------- |
| F1  | Spec: platform recipes (`extensions/visuals`, replace precedence), `componentAliases`, new rules SPEC-079 to 081, recipe in artifact moves; binding-standard exception                                                                                                            | `layer:spec`, `disp:change-spec`                           | approval             |
| F2  | Core: load `extensions/visuals` into `graph.visuals` with a layer and fragment path; file-name check                                                                                                                                                                              | `layer:renderer`, `disp:fix-renderer`                      | F1                   |
| F3  | Core and manifest schema: `componentAliases`, `TokenGraph::canonical_component`, SPEC-081                                                                                                                                                                                         | `layer:renderer`, `layer:spec`                             | F1                   |
| F4  | Validate: SPEC-060..075 over platform-owned recipes; SPEC-076 only for unreplaced foundation recipes; SPEC-079 (warning, promoted to error one minor later), SPEC-080                                                                                                             | `layer:spec`, `layer:renderer`                             | F2                   |
| F5  | CLI and site: `render` and `site` read recipes from the graph and call `canonical_component`; `source` and `aliasOf` in `data.json`                                                                                                                                               | `layer:renderer`                                           | F2, F3               |
| F6  | WASM: `applyPlatform` accepts aliases and platform recipes (test with the iOS Button); changeset                                                                                                                                                                                  | `layer:renderer`                                           | F2, F3               |
| F7  | CI: extend `validate-platform-recipes.mjs` to fail on SPEC-079 although it is a warning                                                                                                                                                                                           | `layer:renderer`                                           | F4                   |
| F8  | iOS data: `button-ios` component, recipe, implementation row, alias (re-scope p6ga.8.6 to slice 1); measure the recipe line count                                                                                                                                                 | `comp:button-ios`, `layer:recipe`                          | F2, F3, F4, F14, F15 |
| F9  | Renderer: `pressScale` prop (schema, `visual.rs`, `visual-runtime.js`, parity)                                                                                                                                                                                                    | `layer:renderer`, `kind:genuine-gap`                       | F8                   |
| F10 | Renderer: unsupported recipe props raise a diagnostic (precondition for p6ga.8.22)                                                                                                                                                                                                | `layer:renderer`, `kind:genuine-gap`                       | none                 |
| F11 | `render` and `site` honor `modeSetRestrictions` (the `apply_configured` result is dropped)                                                                                                                                                                                        | `layer:renderer`, `kind:genuine-gap`                       | none                 |
| F12 | SPEC-079 request grid reads the platform's mode sets (needed once iPadOS or macOS scales exist)                                                                                                                                                                                   | `layer:renderer`                                           | F4, p6ga.8.4         |
| F13 | `query` prints a one-line hint when it names an aliased component under a platform (the alias itself does not apply to `query`)                                                                                                                                                   | `layer:renderer`                                           | F3                   |
| F14 | Renderer: selector templating for any option (`{style}`) in `visual.rs`, compiled recipes, `visual-runtime.js`, the parity test and the spec sentence. Also check that an expanded selector names a declared option. **First follow-up; must land before a third style is added** | `layer:renderer`, `layer:spec`                             | F8 (slice)           |
| F15 | iOS stopgap button tokens (12 Layout tokens, Primary fill and label, disabled fill and content; accent and white are aliases); note on m2xm.2 with the naming convention and the delete-in-the-same-change rule                                                                   | `layer:token`, `comp:button-ios`                           | F2                   |
| F16 | Spec and note: record the scoped exception (platform-owned components may bind tokens directly) in `component-visuals.md` and the binding-standard memory                                                                                                                         | `layer:spec`, `disp:change-spec`                           | none                 |
| F17 | Decide whether iOS disabled colors are platform-wide manifest `overrides` of the foundation tokens (as the iOS token package does) or stay component-scoped stopgap tokens                                                                                                        | `layer:token`, `disp:needs-design`, `kind:source-conflict` | F15                  |
| F18 | Registry vocabulary: style values `premium`, `ai`, `quiet-subdued` (field `variant`) and layout property terms `h-padding`, `v-padding`, `h-gap`, `radius-capsule`; register `button-ios` if advisory warnings call for it                                                        | `layer:token`, `kind:genuine-gap`, `disp:fix-data`         | F15                  |

Gate: F14 before a third `button-ios` style. Existing beads reused: p6ga.8.22 (opacity), 8.23 (gradients), 8.24 (materials), 8.25 (iOS Layout), 8.15, 8.26 (accent label), 8.4, 8.8, 8.31 (modes), 8.32 (exporter grouping), 8.6 (iOS Button data), 8.20 (iOS switch), m2xm.2 (iOS token import). Deferred until needed: `ResolvedData.visuals` for external platform repos.
