<!-- Copyright 2026 Adobe. All rights reserved. -->

# Proposal 018: Name a relationship by its structured fields, not its `context` string

**Status:** Draft. A spike on switch and checkbox is built and committed on `spike/structured-ctr` (commit `fec40095e`, based on `feat/retire-token-bindings`, PR 1948). Nothing else is migrated.\
**Affects:** `packages/design-data-spec/spec/relationship-format.md` (Context), `spec/component-visuals.md` (relationship binding), `schemas/component-visual.schema.json`, `schemas/relationship.schema.json`, rules SPEC-062, 066, 071, 090, 092, 093, `sdk/core/src/visual.rs`, `sdk/core/src/scope.rs`, `sdk/cli/src/spec_sheet.rs`, 4,702 relationship records with a `context`, 389 `context` strings in recipes.\
**Beads:** `qkj5.245` (this proposal). Epic `qkj5`.

## Problem

A relationship says what it is about up to three ways: `scope.part`, `contextPart` and the free-text `context`. SPEC-090 exists only to keep them in agreement. The text `context` is also the key that three other things group by:

* Visual recipes bind on `(property, context)`. 389 context strings are referenced from recipes.
* The option-tie test and SPEC-092 group and reach records by `(component, property, context)`.
* The spec-sheet generator titles each block with it and slugs the block id from it.

Measured on 2026-11-18 on 6,237 records:

| Measure                                                                                              | Records  |
| ---------------------------------------------------------------------------------------------------- | -------- |
| have a `context`                                                                                     | 4,702    |
| have `scope.part`                                                                                    | 445      |
| have `contextPart`                                                                                   | 119      |
| have `contextPart` and no `scope.part`                                                               | 117      |
| have `contextQualifier`                                                                              | 1,660    |
| `contextQualifier` in the form "X to Y" (a gap between two things)                                   | 770      |
| contexts that are design-sheet notes (`Note: ...`, `Row: selected`, `18px (desktop), 20px (mobile)`) | about 20 |
| use `scope.between`, `object`, `position`, `qualifier` or `structure`                                | 0        |

The last row matters. The spec already defines structured scope fields for exactly this. Nothing uses them, so the string carries the meaning.

Switch shows the cost. Two records share `scope: { component: switch, property: space-between }` and differ only in `context: "Spacing (control to label)"` against `"Spacing (top edge to control)"`. Other components already put the difference in scope, for example date-picker `space-between` with `options: { from, to }`.

The `contextPart` records disagree with `scope.part` where both exist. The two entries from PR 1948 say "indicator" against "selection indicator", and "day" against "strikethrough day".

## Proposal

### Identity

A relationship's identity to a recipe is the tuple:

```
(scope.property, contextRole, contextQualifier, scope.part, scope.between)
```

plus its `scope.options`, which still pick among records of one identity at solve time (they are not part of the key a recipe names). A recipe selector names the tuple with the same field names:

```json
{
  "relationship": {
    "property": "space-between",
    "contextRole": ["spacing"],
    "contextQualifier": "control to label",
    "between": { "from": "control", "to": "label" }
  }
}
```

Matching is exact. A field the selector leaves out must be absent on the record, so a selector is never a wildcard and two identities cannot be mistaken for one.

`context` selectors keep working, with the same meaning. A selector that has both `context` and a structured field is invalid.

### `context` is a display label

`context` stays on the record as the label a person reads: the spec sheet block title, the Figma Token Group wording the sheet follows, a changelog line. Nothing binds on it once recipes have moved.

I do not propose to generate it from the fields. The spike measured that this cannot reproduce today's strings (see Spike). Instead:

* A record may carry an authored `context`. SPEC-090 keeps checking that its main word resolves to `contextRole`.
* A record with no `context` gets the derived label (role label, plus the qualifier or `between` in brackets) wherever a label is shown. SPEC-092 then no longer needs a context to make a record reachable.
* The owner decision for this proposal is that a label may change when it gets the structure's wording. A changed label renames and re-ids a spec-sheet block, so changing it is a data change, not a side effect.

### The generator rule

Where a label is derived, the rule is SPEC-090's: role labels joined (`A`, `A and b`, `A, b, and c`), then ` (part)` or ` (qualifier)`. Two additions:

* `scope.part` gives the head word when the record has no role of its own: `Handle (size)` is part `handle` with qualifier `size`.
* `scope.between` gives the bracket: `control to label` is `{ from: control, to: label }` written `{from} to {to}`.

### `contextPart`

Deprecate it. `contextPart` holds real part names (`Dot` on 75 records, `menu item` on 8, `track` on 8, `tree view item` on 7) and none of the 119 values is an "X to Y" form, so the move is `contextPart` to `scope.part`. The 117 records without a `scope.part` need a decision each: the value must be an anatomy part the component declares (SPEC-052), and a few such as `drag handle` or `outline` may not be.

### Recipe binding standard

The `visual-recipe-binding-standard` decision (2026-10-29) says a recipe binds through the component's relationships by default, and a platform-owned component may bind platform tokens directly. This proposal does not change either half. It changes how a relationship is named, not whether the recipe goes through one. The 233 of 266 token selectors in badge, button and action-button that already match a relationship's token migrate to a structured relationship selector, not to a `context` one, once the order below reaches them. The qkj5.11 question (badge font relationships have no context, so is context mandatory) goes away: a structured selector does not need one.

## Spike

Switch and checkbox only, `moon` and `cargo` run one after another.

What changed:

| Item                                                                 | Switch   | Checkbox |
| -------------------------------------------------------------------- | -------- | -------- |
| Relationship records changed (`scope.part` or `scope.between` added) | 41       | 21       |
| Recipe bindings rewritten to a structured selector                   | 30       | 22       |
| Recipe lines before and after                                        | 247, 280 | 411, 406 |

Records changed by kind: `Handle (size)` 16 (part `handle`), `Track (size)` 16 and `Track (border)` 1 (part `track`), `Control (size)` 8, `(border)` 1 and `(rounding)` 4 (part `box`), and the two spacing pairs 8 in each component (`between`). No new registry term was added: `control`, `label` and `top` are in the anatomy and position vocabularies, and `handle`, `track` and `box` are declared parts.

Schema and engine:

* `component-visual.schema.json`: `relationshipSelector` gains four optional fields and a rule that `context` excludes them.
* `scope.rs`: one matcher, `selector_matches` and `selector_identity_matches`, about 24 lines.
* `visual.rs`: the resolver takes a structured selector (a scan, where `context` still uses its index), `recipe_options_in` and the miss message read it, and `with_context_selectors` lowers a recipe to `context` form.
* SPEC-062, 066 and 071 call the matcher. `RelTarget` carries its record.
* `spec_sheet.rs`: calls `with_context_selectors` once, so its four `context` readers needed no change.
* 7 Rust files in all, 205 lines added and 49 removed (about 60 of them are the two new tests), plus the schema, the spec text and a changeset.

Results:

* The renderer reads the same data after the change. 3,072 states (both components, all sizes, both color schemes, both scales, every option combination and the hover, down and keyboard-focus states) gave 6,144 files, SVG and scene JSON, byte-identical to before.
* The spec sheets for both components are byte-identical, with and without `--svg`.
* `moon run design-data:validate` passes. No new diagnostic on either component.
* `moon run sdk:test` passes, 2,298 tests, with the recipe-lint and option-tie baselines unchanged and no baseline raised. `design-data-figma` (137), `cli_figma_export` and `cli_spec_sheet` pass.
* A selector that names no record is reported with its identity. Checked by breaking one.

What did not work, or surprised me:

1. **Generated labels do not reproduce today's strings.** Deriving from `contextRole` and the qualifier equals the stored `context` on 2,928 of 4,702 records (62%). 1,597 (34%) differ and 177 have no `contextRole`. Switch is 70 of 112 and checkbox 80 of 95. The differences are wording the role id loses: `Handle (size)` gives `Control (size)`, `Minimum height` gives `Height`, `Focus indicator` and `Focus ring` both give `Focus`, and `Font size` on font-weight, font-family and line-height has no structured counterpart at all (it is a sheet grouping). The part and `between` rules above recover the 16 `Handle (size)` records on switch and nothing else. That is why `context` stays an authored label.
2. **`scope.part` cannot be the key.** The 3 switch `color` / `Control` records have no part and no options. The handle (twice) and the track (once) all bind them, as one shared token concept. `Control` also spans the handle background and the track border. A backfilled part would be arbitrary. Identity needs `contextRole` and `contextQualifier` beside the part. This contradicts the first draft of the direction ("bind on `(property, part, options)`").
3. **Identity now overlaps.** `Handle (size)` carries part `handle`, role `control` and qualifier `size`. The record is correct and every field is consistent, but a person must decide which field is the source. The proposal does not yet say. See the questions.
4. **The structured selector is longer.** Exact matching means every identity field is written out. Switch grew 33 lines (13%) and checkbox shrank 5. That is the price of the exact rule. A "subset" rule would be shorter and would need an ambiguity check.
5. **No single place loads recipes.** The CLI, WASM, TUI and manifest loader each set `graph.visuals` themselves, so rewriting selectors once at load is not available. That is why the matcher has several callers and why the spec sheet lowers a copy.
6. **Rule text is part of the contract.** SPEC-062's message is in `rules.yaml` and in a conformance fixture. A structured selector needed its own message; the `context` one stays word for word.
7. **Compatibility.** A WASM or CLI build older than this one cannot resolve the new switch and checkbox recipes. The changeset says so, and the change needs a WASM patch release with the data.

## Deprecation sequence

1. **Engine and schema first.** Land the matcher, the selector schema and the rule changes with no data change. Old and new selectors both work. The CLI release (Cargo version bump) and the WASM patch go out before data that needs them.
2. **SPEC-090 stays advisory while both forms exist.** It keeps checking that `context` agrees with `contextRole`, as a warning. It stops being the way two fields are kept in step, because recipes no longer read the string.
3. **`contextPart` deprecation.** Backfill `scope.part` from it, per the table above, then mark the field deprecated in the schema and make SPEC-090 flag a record that still carries it. Remove it in the next major.
4. **Recipe migration, smallest first.** switch and checkbox (this spike), then the recipes with a few bindings, then badge (145 token selectors, the qkj5.11 case), button (86), action-button (35). Each migration is one recipe with a before and after render comparison like the one above.
5. **Qualifiers to `between`.** 770 `contextQualifier` values are "X to Y". Move them to `scope.between` component by component, where the endpoints are already positions, generic anatomy terms or declared parts (SPEC-101). Some, such as "top edge", need a vocabulary decision (see the questions).
6. **Note-like contexts.** About 20 contexts are design-sheet notes. Move them to `notes` or `description`, give the record a real identity, and drop them from SPEC-091's list of unregistered main words.
7. **Last.** Once no recipe in the foundation binds by `context`, SPEC-092 requires a record to be reachable by identity, not by a context, and SPEC-093 (option qualifiers out of contexts) is a relabelling step, not a source of ties.

## Changelog and option-tie grouping

* **Changelog.** `changelog.rs` classes a change to a relationship's `context` as documentation and a change to `value`, `$ref` or `sets` as visual. That already treats the string as a label. A change under `scope` falls to the default and classes as metadata, so a `scope.part` or `scope.between` edit, which can re-point a recipe, would not count as visual. That needs a decision and a test.
* **Option ties.** `relationship_option_ties` groups records by `(component, property, context)`, and its baseline passed unchanged on the spike. It should group by the identity tuple, and the baseline will move: records that share a label but differ in identity stop being counted as one group, and records that differ in label but share identity start being counted together. The moved numbers must be reported, not absorbed.

## The Figma label round trip

The Figma variables export and the plugin never read `context`; checked in `sdk/plugins/figma`, and the plugin tests pass unchanged. The spec text that calls `context` a "Figma Token Group label" refers to the S2 Token Specs Figma file, which is deprecated.

The spec-sheet generator is the real consumer. It titles each block from `context` and builds the block id from that title, so a changed label renames and re-ids a block in a generated Figma spec file. The spike changed no label, and the sheets were identical. Moving a label to a structured wording is therefore a change a designer will see in the sheet, and needs a release note.

## Questions for you

1. **Which field is the source when they overlap?** For `Handle (size)`: part `handle`, role `control`, qualifier `size`. Should `scope.part` replace `contextRole` where it exists, so the record carries part plus qualifier only? That removes the overlap, but SPEC-090 today needs a role before a qualifier.
2. **Exact or subset matching in a selector?** Exact is safe and longer (+13% on switch). A subset rule is shorter, and then needs a rule that rejects a selector that names more than one identity.
3. **Vocabulary for "top edge".** The position list has `top`, `bottom-edge`, `start-edge` and `end-edge` but not `top-edge`. The spike used `top`, so "top edge to control" is `{ from: top, to: control }`. Add `top-edge`, or accept `top`?
4. **How much of the label may change?** You said labels matter little. Should the migration regenerate every label from the structure where it can (and rename the sheet blocks), or only labels that change anyway?
5. **`contextPart` values that are not declared parts** (`drag handle`, `outline`, `cell`): add them to the component's anatomy, drop the field, or leave them as a label?
6. **Release.** The data change needs a WASM patch and a CLI minor. Should the engine ship alone first, as step 1 above?
