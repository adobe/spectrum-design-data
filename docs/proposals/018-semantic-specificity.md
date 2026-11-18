<!-- Copyright 2026 Adobe. All rights reserved. -->

# Proposal 018: Semantic specificity of tokens

**Status:** Draft. No code, schema or data changes come with this document.\
**Bead:** `spectrum-design-data-4juj`.\
**Builds on:** token tiers (`tokenTier`, `impliesTokenTier`, SPEC-102, SPEC-103) from PR [#1932](https://github.com/adobe/spectrum-design-data/issues/1932) and [#1934](https://github.com/adobe/spectrum-design-data/issues/1934).\
**Affects:** `sdk/core` (a new derived value, a lint), `design-data-spec` (a derived-values section), tooling that suggests tokens (MCP, CLI, Studio).

**Why a proposal and not a spec chapter.** The idea is to rank tokens by how specific their meaning is, so a linter can suggest a better-fitting token. The ranking is only useful if it is measured against real data first, and several choices (weights, severity, what counts as a match) are open. Reviewers need the options in one place.

## Problem

Every semantic token says what it is for, but not all say it with the same precision. `accent-background-color-default` is more specific than `background-color`. Today nothing in the data records that, so a tool cannot say "you used the general token; a more specific one already exists for your case".

The tier work answers a coarser question (primitive, semantic or component). This proposal answers the next one: among semantic tokens, which refines which.

## Idea

A token's **semantic specificity** is derived, never stored, in the same way as the derived tier. It works like CSS specificity or the relationship cascade, where a hover relationship beats a default one only when it matches the current context and says more.

Specificity is a **tuple**, compared left to right:

1. **Tier rank:** primitive < semantic < component.
2. **Purpose-field count:** the number of name fields whose catalog entry has `impliesTokenTier: "semantic"` (`colorRole`, `object`, `structure`, `state`, ...).
3. **Alias depth:** the number of aliases between the token and a terminal value. Used only as a tiebreak.

A tuple here just means an ordered list of values, compared one at a time from the left, like sorting names by last name and then first name. First names only matter when the last names are the same. For example:

| Token                             | Tier      | Purpose fields | Alias depth |
| --------------------------------- | --------- | -------------- | ----------- |
| `blue-100`                        | primitive | 0              | 0           |
| `background-color`                | semantic  | 1              | 0           |
| `accent-background-color-default` | semantic  | 3              | 0           |

`accent-background-color-default` ranks above `background-color` because both are semantic, so the comparison moves to the next value and it has more purpose fields (`colorRole`, `object`, `state`). Alias depth is only looked at if the first two values tie. We use a list instead of one combined score so that a large value in one place can't outweigh a difference in tier.

Component tokens and component relationships rank highest because they name one component. Primitives rank lowest because their names say what a value is, not what it is for.

## What the data says

Measured on the non-deprecated tokens in `packages/design-data/tokens/` (2,500 tokens before filtering):

* **Purpose-field count separates well.** Aliases and semantic tokens split 301, 239, 279 and 30 across 1, 2, 3 and 4 purpose fields.
* **Alias depth separates poorly.** 669 aliases point at a value, 181 go through one more alias, 2 go through two. An alias of an alias is often a refactor, not extra meaning, so depth is a tiebreak, not a key.
* **Equal resolved values are common and misleading.** 17 groups of aliases share a property and a terminal value; the largest has 90 members. For example accent and informative subtle backgrounds can resolve to the same value in some modes and still mean different things. Value equality must never be the match test.

## Decisions to make

| #  | Question          | Recommendation                                                                                                                                                         |
| -- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1 | Score shape       | A tuple (tier, purpose-field count, alias depth), compared lexically. Not a single 0 to 100 number: the specificity of a token only means something relative to a use. |
| D2 | Weighting         | Start unweighted. Weighting `anatomy` or `state` above `colorRole` is tempting; add it only if real data shows the unweighted order picks wrong candidates.            |
| D3 | Stored or derived | Derived, from name fields, aliases and the catalog. Never written to token files.                                                                                      |
| D4 | Match test        | **Refinement**, not score. See below.                                                                                                                                  |
| D5 | Lint tiers        | A drop-in suggestion (value-identical in every mode) and a consider suggestion (value differs). The second is never an autofix.                                        |
| D6 | Relationship rank | Follow the existing relationship specificity order rather than define a second one.                                                                                    |
| D7 | Home              | A derived value in `sdk/core` next to `token_tier`, a spec section for the derivation, and an optional lint rule. No new token property.                               |

## Refinement check

A score alone cannot say a token fits. Candidate C **refines** token T when all of these hold:

1. C's name contains every field of T, with the same values (mode-set fields such as `colorScheme` aside).
2. C has the same `property`.
3. C adds purpose fields that are consistent with the usage context (the component, anatomy part, state and so on at the point of use).

Among candidates that refine T, the score only orders them. This is the same shape as CSS: a rule wins because it matches the element and says more, not because its number is bigger.

## Lint behaviour

For a token reference used in a relationship, recipe or authored token:

* **Drop-in:** a refining candidate that resolves to the same value in every mode set (light, dark, wireframe, scale, contrast). Suggested with confidence, and an agent may apply it.
* **Consider:** a refining candidate whose value differs in some mode. Reported as a design question with the differing modes listed. Never applied automatically.
* **Nothing:** no refining candidate exists. No output, so the lint stays quiet on most references.

AI assistance fits here as the step that judges "consistent with the usage context" (refinement point 3) and explains the suggestion. Computing candidates and value-equality stays deterministic.

## Risks

* **False positives from names.** A refining token can be the wrong choice for a reason the name does not show. Mitigation: drop-in requires value identity in every mode, and everything else is a question.
* **Score gaming.** Adding purpose fields to a name raises its score without adding meaning. Mitigation: the refinement check, plus the existing vocabulary registries and SPEC-009 that limit which fields and values are legal.
* **Churn.** Suggesting swaps creates noise in a dataset with 5,000 relationship records. Mitigation: start with a report command, not a validation rule, and add a rule only after the report is useful.

## Plan

1. **Measure.** Write a throwaway script that, for each relationship record and recipe token binding, lists refining candidates. Review a sample by hand, starting with `action-button` background and content states. Record how many suggestions are drop-in, consider or wrong.
2. **Decide D2 and D5** from that sample.
3. **Implement** the derived specificity next to `token_tier`, and a report command (for example `design-data suggest-refinements`).
4. **Optional lint rule** (info severity) only if the report is clean.
5. **Spec section** for the derivation once the shape is stable.

## Out of scope

* Changing token names or values.
* A stored score or any new token property.
* Choosing tokens for a design from scratch; this only compares a token in use against existing ones.
