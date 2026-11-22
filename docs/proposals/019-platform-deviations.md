<!-- Copyright 2026 Adobe. All rights reserved. -->

# Proposal 019: Platform manifest `deviations`

**Status:** Draft; the owner chose option A (decision A309). The spec text, the schema and the rule definitions ship with this proposal (PR 1). The engine and the CLI do not read deviations yet.\
**Issue:** [#1746](https://github.com/adobe/spectrum-design-data/issues/1746), filed from spectrum-rune. The issue expected this to become proposal 016; that number was taken.\
**Affects:** `packages/design-data-spec/spec/manifest.md`, `spec/component-visuals.md`, `schemas/platform-deviation.schema.json`, `rules/rules.yaml` (SPEC-109 to SPEC-111), `sdk/core/src/manifest.rs`, `sdk/core/src/graph.rs`, `sdk/cli/src/render_batch.rs` (`run_compare`), `sdk/cli/src/doctor.rs`, `sdk/cli/src/main.rs` (`validate-manifest`), `sdk/core/src/platform_impact.rs`.

## Summary and recommendation

Add an extension category `platforms/<id>/extensions/deviations/<component>.json`, one file per component, loaded like `visuals/` and `implementations/`. Each entry names a selector (`part`, `property`, `when` states, options, modes), a required `status` (`accepted` or `planned`) and `reason`, and an optional `upstream` and `tolerance`.

1. A renderer **MUST NOT** read a deviation. It changes no scene and no value.
2. `render-compare` matches a difference to a deviation. A matched difference is reported as a known deviation with its reason and upstream link, gets no gap suggestion and does not trip `--fail-on-diff`. A deviation that was compared and produced no difference is `stale`; one that was not compared is `notEvaluated`.
3. `validate-manifest`, `platform doctor` and `platform impact` check that a selector still names a component, part, state and option.

The change is additive: a spec minor, about five PRs (S, M, M, S, S).

## The problem

A platform that cannot match a foundation recipe has nowhere to say so. It can leave the gap invisible, so `render-compare` suggests the same gap bead on every run (a difference carries a `gap` suggestion; `docs/visual-comparison.md:110`, `:112`). Or it can hide the gap with a token `override`, which changes the value for everything on that platform, and `render-compare` goes green while the design intent is not met.

spectrum-rune is the first implementation-owned platform manifest. Its README "Known gaps" (`/spectrum-rune/README.md:325`) records cases that come from missing Rune APIs:

| Component                                         | Part / state                                                  | Gap                                                                                                                                               | Upstream                                                                                                                              |
| ------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Switch, Checkbox, Radio button                    | track / box / control, unselected, `keyboard-focus`, `stroke` | The oracle changes the stroke in focus-visible (2px, `41` to `19` in light). Rune has no focus-visible border colour.                             | [rune#106](https://github.com/rune/spectrum-design-data/issues/106), [#328](https://github.com/adobe/spectrum-design-data/issues/328) |
| Button, Action button                             | hover + `keyboard-focus`                                      | Focus should beat hover (label `41`/`218` instead of `19`/`198`). The view cannot see focus, so the precedence is not drawn.                      | [rune#106](https://github.com/rune/spectrum-design-data/issues/106)                                                                   |
| Radio button (selected neutral), Accordion header | `down` + `keyboard-focus`                                     | A pointer press hides keyboard focus in Rune (`focus_visible` is false until a navigation key). The oracle takes the hover fill or the focus ink. |                                                                                                                                       |
| Button                                            | pending                                                       | No `aria-busy` setter.                                                                                                                            | [rune#660](https://github.com/rune/spectrum-design-data/issues/660)                                                                   |
| every component with text                         | `fontFamily`                                                  | Rune does not expose the resolved family in `ElementInfo`.                                                                                        | [rune#577](https://github.com/rune/spectrum-design-data/issues/577)                                                                   |

(The README names [rune#106](https://github.com/rune/spectrum-design-data/issues/106) and the bead `a14.14` for the stroke and the keyboard-focus cases; [#328](https://github.com/adobe/spectrum-design-data/issues/328), [#660](https://github.com/adobe/spectrum-design-data/issues/660) and [#577](https://github.com/adobe/spectrum-design-data/issues/577) are from the issue.) Today these live in README prose and in tests that pin the wrong look (`a_press_on_a_keyboard_focused_*`). No tool reads them.

## Goals and non-goals

**Goals.** Record a known platform gap as data the manifest carries. Let `render-compare` tell a known gap from a new one. Notice when a deviation is stale or its selector has drifted. Give two platforms with the same deviation a queryable form (`artifact-moves.md` asks for evidence from two platforms before a promotion).

**Non-goals.** Changing what a renderer draws (overrides and platform recipes do that). A foundation-wide "not visual" declaration (`notVisual` on a recipe means an option is deliberately not visual, for every platform). Showing deviations on spec sheets. A cross-component wildcard. Teaching `render-compare` new properties.

## Options

|       | Option                                                          | Verdict                                                                                                                                   |
| ----- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **A** | New extension category `extensions/deviations/<component>.json` | **Chosen by the owner.** Fits the house layout, validates against its own schema, selectors reuse the recipe condition shape.             |
| B     | An array on `manifest.json`                                     | Breaks the house layout: everything else platform-local is a directory of one file per artifact.                                          |
| C     | Notes on `implementations` rows                                 | A row is per component and package. It has no part, property or state to match a difference against.                                      |
| D     | Oracle-side configuration only (status quo)                     | `render-compare` cannot read it, and the manifest does not carry it when ejected.                                                         |
| E     | Token overrides or a platform recipe                            | Rejected. Overrides change values and hide the gap. A platform recipe replaces the foundation recipe whole, hiding the foundation intent. |

## Design (option A)

### File layout

`platforms/<id>/extensions/deviations/<component>.json`, discovered like the other categories (recursive `*.json`, sorted path order). Today `sdk/core/src/manifest.rs` rejects an unknown subdirectory (`known_subdirs`, around line 368), so PR 2 adds `deviations` there.

### Schema

`schemas/platform-deviation.schema.json` (Layer 1).

| Field                    | Required | Notes                                                                                                                     |
| ------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------- |
| `component`              | yes      | Name; resolves directly or via `componentAliases`                                                                         |
| `deviations[].id`        | yes      | Slug, unique per file                                                                                                     |
| `deviations[].status`    | yes      | `accepted` or `planned`                                                                                                   |
| `deviations[].reason`    | yes      |                                                                                                                           |
| `deviations[].part`      | no       | Absent means any part                                                                                                     |
| `deviations[].property`  | no       | Absent means documentation only                                                                                           |
| `deviations[].when`      | no       | `states`, `options`, `modes`: the recipe condition shape (`component-visual.schema.json`, `condition`) without `position` |
| `deviations[].upstream`  | no       | URI                                                                                                                       |
| `deviations[].tolerance` | no       | Number                                                                                                                    |

### Rules

* **SPEC-109** (Layer 1, error): the file validates against the schema; `id` is unique per file.
* **SPEC-110** (Layer 2, error): `component` resolves (`TokenGraph::canonical_component`, `graph.rs:1969`); `part` is in the resolved anatomy; every `when.states` value is a state of the component; every `when.options` key and value exists; modes are known. Follows SPEC-060 and SPEC-061.
* **SPEC-111** (Layer 2, warning): `property`, when present with `part`, is a property the effective recipe sets for that part.

Ids SPEC-109 to SPEC-111 are the next free after SPEC-108.

### Command behaviour

* **`render-compare`** (`run_compare`, `sdk/cli/src/render_batch.rs:261`, with `--fail-on-diff`). Matching is by `part`, `property` and `when` taken from each batch entry's request fields. A matched difference moves from `differences` to `knownDeviations` (id, reason, upstream, status) and does not count for `--fail-on-diff`. A deviation whose selector was compared and produced no difference is `stale` ("the platform now matches, remove it"), a warning. A deviation not compared in the run is `notEvaluated`, never stale. A deviation with no `property`, or on a property compare does not diff (`fontFamily`), is listed, not matched. A `platform` flag picks the manifest; `tolerance` widens what counts as the deviation.
* **`validate-manifest` and `platform doctor`** report `MANIFEST-007` for a selector that no longer names an existing component, part, state or option. The memo assumed `MANIFEST-003`; that id is already the relationship check (`main.rs:3005`), so this proposal uses the next free, `MANIFEST-007`.
* **`platform impact`** reports `deviation-dangling` (the selector names something the change removed) and `deviation-review` (the change touched the deviation's part or property).

## Cost

Serial where `sdk/core` is touched.

| PR | Content                                                                                                    | Size |
| -- | ---------------------------------------------------------------------------------------------------------- | ---- |
| 1  | Proposal, spec text, schema, rule definitions, fixtures (this PR)                                          | S    |
| 2  | Core loading (`manifest.rs` allowlist and category, `graph.rs`), SPEC-109 to SPEC-111 in `default_rules()` | M    |
| 3  | `render-compare` matching, `platform` flag, tolerance, summary counts, `docs/visual-comparison.md`         | M    |
| 4  | `validate-manifest` and `platform doctor` (`MANIFEST-007`)                                                 | S    |
| 5  | `platform impact` findings                                                                                 | S    |

Then spectrum-rune moves its README rows into `extensions/deviations/` once PR 2 ships.

## Risks

* **Identity drift with proposal 018.** Selectors name parts and states, not relationship contexts, so 018 should not break them. If 018 lands first, reuse its identity.
* **Compound states.** `when.states` is all-of, as in `scope.options.state`; an any-of (proposal 017) is not supported here.
* **A mute button.** A broad deviation could hide real differences. Only selectors with a `property` match, and a stale report catches one that no longer applies.
* **Not verified.** `render-compare` was not run against Rune measurements: Rune uses its own harness, so adoption is unconfirmed. `platform_impact.rs` and `run_compare` were not read in full, so the sizes of PRs 3 and 5 are estimates.

## Owner decisions taken

1. Location: `extensions/deviations/<component>.json` (option A).
2. `status` is required, `accepted` or `planned`.
3. A matched deviation exempts the difference from `--fail-on-diff`. Otherwise platforms would keep overriding tokens.
4. No cross-component wildcard for now: repeat an entry per component.
5. Spec sheets do not show deviations; the catalog only.
6. `render-compare` learns `fontFamily` as a separate follow-up.
7. A stale deviation is a warning.

## What would change it

A second platform whose limits do not fit part, property and state selectors. spectrum-rune not using `render-compare` (then only PRs 1, 2 and 4). Proposal 018 landing first. The owner treating every platform difference as a foundation question.
