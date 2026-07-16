# Proposal 006: Vocabulary Gaps

**Status:** dsi.2.5 implemented 2026-07-15 (clean additive batch below); remaining
taxonomy-call groups tracked under dsi.2.1-2.4/2.6/2.7\
**Affects:** 161 distinct active tokens across multiple source files\
**Spec reference:** design-system-registry vocabulary files

## Problem

After Phases 1-2 registry expansions and Proposals 001-005, this proposal originally
estimated \~70 residual tokens. A fresh `moon run token-mapping-analyzer:analyze` run
(2026-07-14, post PR [#1233](https://github.com/adobe/spectrum-design-data/issues/1233)/[#1234](https://github.com/adobe/spectrum-design-data/issues/1234)/dsi.3) shows the actual `vocabulary-gap` +
`spatial-qualifier` residual is **161 distinct tokens** — the earlier estimate undercounted
by more than 2x. `heading` and `popover` (originally listed here) are already resolved —
both are registered in `components.json`/`anatomy-terms.json` from prior work.

This document re-scopes to the real inventory, grouped by the unmatched segment. Groups
marked **taxonomy call** surfaced a naming-convention question during re-scoping, not just
a missing vocabulary term — do not auto-register; resolve the question first.

## Proposed additions (clean additive — registry term only)

| Group              | Segment(s)                                                                  | Registry                                          | Count | Example                                                                    |
| ------------------ | --------------------------------------------------------------------------- | ------------------------------------------------- | ----- | -------------------------------------------------------------------------- |
| Spatial qualifiers | `inner`, `outer`                                                            | `positions.json`                                  | 11    | `color-handle-inner-border-color`                                          |
| Position           | `below`                                                                     | `positions.json`                                  | 4     | `user-card-minimum-height-title-below-extra-large`                         |
| Anatomy            | `pagination`                                                                | `anatomy-terms.json`                              | 2     | `coach-mark-pagination-color`                                              |
| Color variant      | `subtle`                                                                    | variant/property term                             | 25    | `blue-subtle-background-color-default` (20 color-family + 5 semantic-role) |
| Color variant      | `subdued`                                                                   | variant/property term                             | 8     | `neutral-subdued-background-color-default`                                 |
| Layout             | `layer` (+ index)                                                           | scale/position term                               | 2     | `background-layer-1-color`                                                 |
| Layout             | `precision`                                                                 | anatomy/qualifier term                            | 5     | `slider-handle-height-precision-large`                                     |
| Layout             | `row`                                                                       | anatomy term                                      | 4     | `table-section-header-row-height-large`                                    |
| Layout             | `slash`                                                                     | anatomy term                                      | 4     | `swatch-slash-thickness-large`                                             |
| Layout             | `stacked`                                                                   | qualifier term                                    | 4     | `in-field-button-width-stacked-large`                                      |
| Layout             | `collapsed` / `expanded`                                                    | qualifier term                                    | 2     | `coach-indicator-collapsed-ring-thickness`                                 |
| Layout             | `square`                                                                    | anatomy term                                      | 2     | `opacity-checkerboard-square-size-medium`                                  |
| Layout             | `multiline`                                                                 | qualifier term                                    | 1     | `breadcrumbs-height-multiline`                                             |
| Color              | `drag`                                                                      | qualifier term                                    | 2     | `bar-panel-gripper-color-drag`                                             |
| Color              | `well`                                                                      | anatomy term                                      | 1     | `card-background-well-color`                                               |
| Color              | `opacity` (as property suffix)                                              | property term                                     | 3     | `card-selection-background-color-opacity`                                  |
| Color              | `indicator`                                                                 | anatomy term                                      | 2     | `static-black-track-indicator-color`                                       |
| Color              | `highlight`                                                                 | qualifier/state term                              | 3     | `stack-item-selected-background-color-highlight`                           |
| Typography         | `xxxxl`                                                                     | `sizes.json` scale (currently tops out at `xxxl`) | 2     | `heading-size-xxxxl`                                                       |
| Misc singles       | `4x`, `track`+`width`, `drop`+`target`, `underline`, `minimum`, `rectangle` | various                                           | 6     | `base-gap-4x-large`, `text-underline-thickness`                            |

## Compound properties

| Property                                | Tokens | Example                                                                                                                                                                                            |
| --------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `line-height`                           | 18     | `line-height-font-size-100` (already listed in the decomposer's compound-property list but matching fails when split — needs a decomposer fix, not a registry add)                                 |
| `component-height` / `component-size-*` | 8      | `component-height-100`, `component-size-difference-down` — `component` itself is unmatched; likely needs registration as a compound-property prefix like `line-height`, not a standalone component |

## Size/shape special values

| Value                                                   | Field      | Tokens | Example                           |
| ------------------------------------------------------- | ---------- | ------ | --------------------------------- |
| `full`                                                  | shape      | 1      | `corner-radius-full`              |
| `none`                                                  | shape      | 1      | `corner-radius-none`              |
| `size` compound (`corner-radius-{small,medium}-size-*`) | shape/size | 9      | `corner-radius-medium-size-large` |

## Property vocabulary

| Value        | Tokens | Example                           |
| ------------ | ------ | --------------------------------- |
| `multiplier` | 7      | `button-minimum-width-multiplier` |

`multiplier` appears as a property modifier on minimum/maximum-width tokens. Treat as a
compound property (`minimum-width-multiplier`) or a standalone property term.

## Implementation notes (dsi.2.5)

* `layer`/`underline` were **not** registered as anatomy terms: the tokens that motivated
  them (`background-layer-*-color`, `text-underline-thickness`) have no `component` field,
  and SPEC-025 forbids `anatomy` without `component`. Both stay fused in `property`
  (`background-layer-color`, `text-underline-thickness`).
* `heading-size-xxxxl`/`heading-cjk-size-xxxxl` keep `size-xxxxl`/`cjk-size-xxxxl` fused in
  `property`, matching the existing unextracted `xxxl` sibling tokens. `xxxxl` in
  `sizes.json` is exercised by `base-gap-4x-large` (`size: "xxxxl"`). Decomposing the full
  `heading-*-size-*` family (`component`/`family`/`size`/`property:"font-size"`) is
  out of scope here — tracked as a separate follow-up.
* `color-control-track-width` decomposes to `component:"color-control"`,
  `anatomy:"track"`, `property:"width"` (`color-control` newly registered in
  `registry/components.json`). This adds a `component` key to the published legacy
  JSON that wasn't there before (legacyKey pins the flat key string, not other
  attributes) — `packages/tokens/src/layout.json` was regenerated accordingly.

## Taxonomy calls (resolve before implementing — not simple vocab adds)

| Group                                                                                                                                                    | Tokens | Question                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `number-field-with-stepper-*`                                                                                                                            | 4      | The unmatched segment is the connector word `with`, not `stepper` (already registered). Registering `with` as a term is a filler-word precedent with broad blast radius — may instead need a decomposer rule to skip known connector words.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `tab-gap-horizontal-*`                                                                                                                                   | 4      | `tabs` (plural) is registered as a component; `tab` (singular) is not. Decide: register `tab` as an alias/synonym of `tabs`, or treat as a distinct anatomy term.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ~~`heading-cjk-font-weight`-style typography self-reference~~ (`bold-font-weight`, `italic-font-style`, `regular-font-weight`, `extra-bold-font-weight`) | 4      | **Resolved (spectrum-design-data-dsi.2.7).** Not a decomposer pattern or missing vocab term — the doubled names only appeared in a stale analyzer artifact; the qualifier vocab (`bold`/`extra-bold`/`regular`/`italic`) was already registered. The real defect was `weight`/`style` carrying `excludeFromLegacyKey: true`, which forced the decomposer to leave the qualifier fused into `property`. Fixed by promoting `weight`/`style` to Phase D decomposition (mirroring the `size` precedent from the 2026-07-14 font-size migration): dropped the exclusion flag and pinned an explicit `legacyKey` on the 8 affected tokens (also covers `black-`, `light-`, `medium-font-weight` and `default-font-style`, which were half-migrated). See `.changeset/dsi27-weight-style-phase-d.md`. |

## Impact

* 161 distinct tokens addressed once all groups above are resolved
* Registry-only groups (129 tokens across \~19 sub-groups) are additive, no schema changes,
  and independently implementable in small batches
* 3 groups (11 tokens) require a taxonomy/decomposer decision before implementation
* Re-run `moon run token-mapping-analyzer:analyze` after each batch to confirm residual drop
