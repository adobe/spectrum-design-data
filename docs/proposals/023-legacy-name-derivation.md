<!-- Copyright 2026 Adobe. All rights reserved. -->

# Proposal 023: Derive legacy token names from record scope

**Status:** Decided 2026-11-26 by the owner; implementation follows in the slices below. This PR changes no code, data or schema. Bead `spectrum-design-data-5m92.43`.
**Builds on:** [proposal 018](018-structured-relationship-identity.md) (structured relationship identity), [proposal 015](015-single-visual-engine.md) (single visual engine).
**Affects:** `sdk/core` (`legacy`, `naming`, `visual` display code), the relationship record schema, anatomy declarations, the wasm `TokenResult`, `design-data-mcp`, `visuals/*.json` selectors, and the `legacyKey` field on records and tokens.

## Summary

The legacy output (`@adobe/spectrum-tokens`) needs a name for every token. Today those names are kept by hand in `legacyKey` pins: 558 on live relationship records and 159 on live tokens. This proposal makes the name derived. A record opts in to legacy output with `legacyKey: true` and the engine builds its legacy name from its scope. A string `legacyKey` stays only where the name is irregular. The 159 token pins are removed by teaching every reader to use the legacy name the engine already computes.

## Problem

* **A record's `legacyKey` is a switch and a name at once.** `ctr_to_legacy_token` returns nothing for a record with no `legacyKey`, because 4,566 live records are relationship-only or net new and have no legacy counterpart. When a record has one, the string is the whole legacy name. The generator never computes a name from scope, so all 558 live record pins are non-removable.
* **Token pins are read by more than legacy output.** PR 2190 removed 194 token pins and had to keep 159 more. Those are read by spec sheets (57), the site build (33), recipe renders (68) and the MCP query (1). Each reader shows the pin, not the name `extract_legacy_key` builds, so removing the pin changes their output even though legacy output is unchanged.
* **The same name is typed twice.** The name is already implied by the scope (component, part, property, options). A pin repeats it and drifts when a part is renamed.

## Decision

Decided by the owner on 2026-11-26.

1. **One field, one accessor.** A record's `legacyKey: true` means: derive the legacy name from the record's scope. A string `legacyKey` means an irregular pin that wins over derivation. One accessor returns the legacy name for a record or token; the 17 read sites move to it.
2. **Typography is a rule.** The typography `size-{id}` names are derived by an engine rule keyed on the typography category, not by pins.
3. **Everything shows the legacy name.** Renders, the site and the MCP show the derived legacy name for every token. About 1,383 labels change for tokens that carry no pin today. Snapshot and MCP output updates are expected and are part of the change.
4. **The 159 remaining token pins go through slice 1.** The display name comes from `extract_legacy_key` in `token_label`, `rank_key`, the `legacyKey` selectors, the wasm `TokenResult.legacyName` and the MCP.
5. **Deprecated records are a frozen archive.** They are never derived and keep their string pins.
6. **`@adobe/spectrum-tokens` stays the only compatibility surface.** No shims and no second legacy format.
7. **Derivation code lives outside `wasm-visual` where possible.** The wasm budget (528,000 bytes raw, 201,100 gzipped) must not rise.

## Algorithm

### Name parts

The legacy name is built from the parts of a record's scope in the order the existing `extract_legacy_key` walk visits them: component, anatomy part, property, then options and states.

* Each anatomy part gets an optional `legacyName`. The part contributes that string when it is set and its own id otherwise.
* An empty `legacyName` drops the part from the name. This covers the root part, which 34 components leave out of legacy names, and lets the 21 renamed parts say what legacy calls them.
* The parts are joined by the existing serialization, so derivation reuses the walk that already produces legacy keys for tokens instead of adding a second one.

### Typography rule

The 66 typography records whose legacy name is `size-{id}` are covered by one engine rule keyed on the typography category. The rule reads the scale id from the scope. It is a rule, not data, because the shape is the same for every record in the category.

### Pins

A pin is still the right tool for two cases: word order that differs from the scope order, and a one-off word legacy uses that no part or option carries. A string `legacyKey` wins over derivation.

### Validation

* **Redundant pin is a warning.** A string `legacyKey` equal to the derived name can be deleted. The warning keeps the pin count falling.
* **Duplicate derived name is an error.** Two legacy-visible records that derive the same name collide in legacy output, and validation fails.
* **Deprecated records are skipped.** They are never derived and never checked for redundancy.

Each new rule is registered in `default_rules()` and has a test that fails when the rule is disabled.

## Measured coverage

Measured on main at [`a302bb1`](https://github.com/adobe/spectrum-design-data/commit/a302bb18) with `design-data-cli@0.63.7`, live records and tokens only.

### Token pins (159 remaining)

| Reader that shows the pin | Pins |
| ------------------------- | ---: |
| Spec sheets               |   57 |
| Site determinism          |   33 |
| Recipe renders            |   68 |
| MCP query                 |    1 |
| **Covered by slice 1**    |  159 |

Every one of these already matches `extract_legacy_key`. The work is display, not naming.

### Record pins (558 live)

| Class                  | Pins | Outcome                        |
| ---------------------- | ---: | ------------------------------ |
| Exact derivation       |   68 | Derived                        |
| Root part omitted      |  239 | Derived, empty `legacyName`    |
| Typography `size-{id}` |   66 | Derived by the typography rule |
| Renamed part           |   63 | Derived, part `legacyName`     |
| **Derivable**          |  436 |                                |
| Word order differs     |   49 | Stay pins                      |
| Different words        |   31 | Stay pins                      |
| Extra words            |   28 | Stay pins                      |
| Dropped words          |   14 | Stay pins                      |
| **Remain pins**        |  122 |                                |

## Slices

Each slice is its own PR with the gates below. Slices 1 and 2 are engine work and run in order. Slices 3 and 4 are data.

1. **Slice 1, display name for tokens.** Call `extract_legacy_key` from `visual::token_label` and `rank_key`, the 27 `legacyKey` selectors in six `visuals/*.json` files, the wasm `TokenResult.legacyName` and the MCP `tokenLabel` and `compactToken`. Then a data PR deletes the 159 token pins. Snapshots and MCP output change here (about 1,383 labels), and the PR says so.
2. **Slice 2, record derivation.** Add the `legacyKey: true` switch to the relationship record schema, the anatomy `legacyName` field and the derivation in native `sdk/core`. Move the 17 read sites to one accessor. Add `components/` to the cache inputs of `tokens:verifyLegacyOutput`, since derivation now reads anatomy. Add the two validation rules.
3. **Slice 3, anatomy data.** Add the 55 `legacyName` entries (34 root parts and 21 renamed parts).
4. **Slice 4, convert record pins.** Turn the 436 derivable record pins into `legacyKey: true` in component batches. The 122 irregular pins stay as strings.

## Gates

Every slice that touches engine or data must pass all of these.

* **Byte-identical legacy output.** `design-data migrate legacy-output --output <dir>`, then `diff -rq <dir> packages/tokens/src` is empty, and `migrate legacy-verify` passes.
* **Recipe snapshots.** `recipe_snapshots` passes. Only slice 1 may change them, and only for the label changes in decision 3.
* **Spec sheets.** `spec-sheet --all` output is unchanged apart from slice 1 labels.
* **Wasm budget.** The `wasm-visual` budget test passes at 528,000 raw and 201,100 gzipped, run on every slice.
* **Validation.** `design-data validate` reports no new errors, and each new rule fails a test when disabled.

## Risks

* **Visible label change in slice 1.** About 1,383 labels move to legacy names. Consumers that read MCP output by the old cascade name will see a difference.
* **`rank_key` change can change picks.** Ranking by legacy name can reorder ties. Snapshots catch this, and the PR reviews each changed pick.
* **Name drift.** Renaming an anatomy part id changes a derived name unless its `legacyName` is set. The duplicate and byte-identical gates catch it.
* **Wasm budget.** Display code in slice 1 sits near the visual engine. It is built to live outside `wasm-visual`, and the budget test runs every slice.
* **JS analyzer mirror.** The JavaScript analyzer duplicates part of the naming logic. It is not a gate, so it can lag until it is updated.

## Not covered

* Deprecated records and their pins (decision 5).
* The 122 irregular record pins. They stay strings.
* Any new compatibility surface. `@adobe/spectrum-tokens` remains the only one.
* Net-new records. Without `legacyKey` they stay out of legacy output, as today.

## What would change this

* `@adobe/spectrum-tokens` becoming a frozen static artifact, which would make deriving names unnecessary.
* A wasm budget increase being accepted.
* Reversing decision 3, which would keep pins for display and defeat slice 1.
