<!-- Copyright 2026 Adobe. All rights reserved. -->

# Proposal 018: Name a relationship by its structured fields, not its `context` string

**Status:** Draft. A spike on switch and checkbox is built on `spike/structured-ctr` (based on `feat/retire-token-bindings`, PR 1948). Nothing else is migrated.\
**Affects:** `packages/design-data-spec/spec/relationship-format.md` (Context), `spec/component-visuals.md` (relationship binding), `schemas/component-visual.schema.json`, `registry/relationship-contexts.json`, rules SPEC-062, 066, 071, 090, 092, 093, `sdk/core/src/visual.rs`, `sdk/core/src/scope.rs`, `sdk/cli/src/spec_sheet.rs`, 4,702 relationship records with a `context`, 389 `context` strings in recipes.\
**Beads:** `qkj5.245` (this proposal). Epic `qkj5`.

## Problem

A relationship says what it is about up to three ways: `scope.part`, `contextPart` and the free-text `context`. SPEC-090 exists only to keep them in agreement. The text `context` is also the key that other things group by:

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
| have a `contextRole`                                                                                 | 4,525    |
| have a `contextRole` that is also an anatomy term (`control`, `track`, `label`, ...)                 | 1,680    |
| contexts that are design-sheet notes (`Note: ...`, `Row: selected`, `18px (desktop), 20px (mobile)`) | about 20 |
| use `scope.between`, `object`, `position`, `qualifier` or `structure`                                | 0        |

Two rows matter most.

The spec already defines structured scope fields for gaps and parts, and nothing uses them, so the string carries the meaning.

The role vocabulary mixes two kinds of word. Of the 34 terms in `registry/relationship-contexts.json`, 20 are also anatomy terms (`label`, `icon`, `control`, `track`, `gripper`, `tab-item`, ...). The other 14 are kinds of thing (`spacing`, `background`, `border`, `size`, `rounding`, `height`, ...). So records read backwards. Switch "Handle (size)" has role `control` (a part word) and qualifier `size` (a kind word), while `scope.part` says `handle`.

Switch shows the cost. Two records share `scope: { component: switch, property: space-between }` and differ only in `context: "Spacing (control to label)"` against `"Spacing (top edge to control)"`. Other components already put the difference in scope, for example date-picker `space-between` with `options: { from, to }`.

The `contextPart` records disagree with `scope.part` where both exist. The two entries from PR 1948 say "indicator" against "selection indicator", and "day" against "strikethrough day".

## Proposal

### Identity

A relationship's identity to a recipe is the combination of:

| Field              | Holds                                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| `scope.property`   | what is styled                                                                                     |
| `scope.part`       | the anatomy part the value is drawn on, a part the component declares (SPEC-052)                   |
| `scope.between`    | the two ends of a gap, `{ from, to }` (SPEC-101)                                                   |
| `contextRole`      | the kind of thing, from the non-anatomy terms of the registry (`spacing`, `size`, `rounding`, ...) |
| `contextQualifier` | only what none of the above can say (`down`, `top edge to control`)                                |

`scope.options` still pick among records of one identity at solve time and are not part of the key.

Three rules keep the fields from overlapping:

1. **A part word is a part, not a role.** Where the component declares the part, the record carries `scope.part` and no anatomy-word role. "Handle (size)" is `size` with part `handle`, with no role and no qualifier.
2. **A qualifier says only what part and between cannot.** An "X to Y" qualifier moves to `between`. A qualifier that restates the property (`size` on a `size` record) goes. What remains is things like `down`.
3. **A record shared by several parts has no part.** The spike found a token concept the handle and the track both use, with no single owner. It stays part-less and keeps its role, which may be an anatomy word (`control`). A part would be arbitrary. See the questions.

### The selector

A recipe selector names the fields it needs with the record's own field names:

```json
{ "relationship": { "property": "background-color", "part": "handle" } }
{ "relationship": { "property": "space-between", "between": { "from": "control", "to": "label" } } }
```

Matching is by subset: a selector matches every record whose fields equal the ones the selector gives, and a field it leaves out is not compared. A selector **MUST** name exactly one identity, and SPEC-062 reports one that names several, with each identity on a line (an example of the form it takes):

```
Selector {"property":"color"} names 2 relationship identities for 'switch':
  color / - / - / focus-indicator / -; color / control / - / - / -
```

An identity line is `property / role / qualifier / part / between`, with `-` for a field the record lacks. It is also the unit a person can read when deciding whether two records collide.

`context` selectors keep working with the same meaning. A selector with both `context` and a structured field is invalid.

### `context` is a display label

`context` stays on the record as the label a person reads: the spec sheet block title, the wording the Figma sheet follows, a changelog line. Nothing binds on it once recipes have moved. Where a record has no `context`, the label is generated:

* With a `contextRole`: the role labels joined (`A`, `A and b`, `A, b, and c`), then ` (qualifier)`, or ` (from to to)` for a `between`. This is SPEC-090's rule, plus the `between` bracket the spike added.
* Without a role: the part's name, `handle` as `Handle`.

An authored `context` is checked by SPEC-090 against the role only. The owner decision for this proposal is that a label may change when it moves to the structure's wording. A changed label renames and re-ids a spec-sheet block, so it is a data change with a release note.

### `contextPart`

Deprecate it. `contextPart` holds real part names (`Dot` on 75 records, `menu item` on 8, `track` on 8, `tree view item` on 7) and none of the 119 values is an "X to Y" form, so the move is `contextPart` to `scope.part`. The 117 records without a `scope.part` need a decision each: the value must be an anatomy part the component declares, and a few such as `drag handle` or `outline` may not be.

### Recipe binding standard

The `visual-recipe-binding-standard` decision (2026-10-29) says a recipe binds through the component's relationships by default, and a platform-owned component may bind platform tokens directly. This proposal changes neither half. It changes how a relationship is named. The 233 of 266 token selectors in badge, button and action-button that already match a relationship's token move to a structured relationship selector, not to a `context` one. The qkj5.11 question (badge font relationships have no context, so is context mandatory) goes away.

## Spike

Switch and checkbox only. Tests and builds ran one after another.

What changed:

| Item                                         | Switch    | Checkbox  |
| -------------------------------------------- | --------- | --------- |
| Relationship records changed                 | 85 of 152 | 63 of 111 |
| `scope.part` added                           | 61        | 55        |
| `scope.between` added                        | 8         | 8         |
| role dropped (a part or between now says it) | 77        | 55        |
| qualifier dropped                            | 37        | 17        |
| Recipe bindings rewritten                    | 30        | 22        |
| of those, `{property}` alone                 | 17        | 15        |
| of those, `{property}` plus one field        | 13        | 7         |
| Recipe lines before, after                   | 247, 199  | 411, 351  |

`context` strings were not touched, so no block id moved. No new registry term was added: `control`, `label` and `top` are in the anatomy and position vocabularies, and `handle`, `track`, `box`, `label` and `focus-indicator` are declared parts.

Schema and engine, 8 Rust files in all, 360 lines added and 55 removed (about 140 of them tests), plus the schema and spec text:

* `component-visual.schema.json`: `relationshipSelector` gains four optional fields and a rule that `context` excludes them.
* `scope.rs`: the subset matcher and `relationship_identity`.
* `visual.rs`: the resolver takes a structured selector, `recipe_options_in` and the miss message read it, and `with_context_selectors` lowers a recipe to `context` form.
* SPEC-062 gains the one-identity check; SPEC-066 and SPEC-071 call the matcher; SPEC-090 derives the `between` bracket. `RelTarget` carries its record.
* `spec_sheet.rs` calls `with_context_selectors` once, so its four `context` readers needed no change.

Results:

* The renderer reads the same data after the change. 3,072 states (both components, all sizes, both color schemes, both scales, every option combination and the hover, down and keyboard-focus states) gave 6,144 files, SVG and scene JSON, byte-identical to before. The spec sheets are byte-identical, with and without `--svg`.
* `moon run design-data:validate` passes with no diagnostic on either component. `moon run sdk:test` passes, 2,301 tests, with the recipe-lint and option-tie baselines unchanged and no baseline raised. `design-data-figma` (137), `cli_figma_export` and `cli_spec_sheet` pass.
* A selector that names no record is reported with its identity (checked by breaking one). A selector that names two is reported by SPEC-062 (unit test).

What did not work, or surprised me:

1. **Generated labels do not reproduce today's strings, and moving to the structure makes that worse.** Deriving from role plus qualifier equals the stored `context` on 2,928 of 4,702 records (62%). On the spike data, a part-first generator (role, else the part's name; qualifier or `between` in brackets) matches 46 of 112 switch contexts and 54 of 95 checkbox ones. The rest differ in wording, not meaning: `Handle (size)` gives `Handle`, `Control` gives `Handle`, `Track` or `Box`, `Font size` gives `Label`, `Focus ring` gives `Focus indicator`, `Minimum height` gives `Height`. That is the label cost the owner accepted. It is also why `context` stays an authored field.
2. **Most bindings needed only a property.** 32 of 52 recipe selectors are `{property}` with nothing else, because once `part` is set the property is unique within the component. For these two components `context` was documentation, not identity. A bare selector is fragile: adding a second record for that property makes it ambiguous. SPEC-062 now reports that, but it is a reason to ask whether a bare selector should be allowed (question 2).
3. **Subset matching cannot select a part-less record when its property also has records with a part.** The three switch `color` / "Control" records have no part, while `color` / "Focus indicator" has one. A selector with no `part` matches both. The part-less records have to be told apart by their role (`contextRole: ["control"]`), so an anatomy-word role survives on the shared concepts. Matching "no part" explicitly would be an alternative.
4. **`scope.part` cannot be the key on its own.** The same three records are one shared concept the handle (twice) and the track (once) all bind. A backfilled part would be arbitrary.
5. **Role is nearly redundant with property in these two components.** It survives only on `Rounding`, `Minimum height`, `Component size (down)`, the spacing records and the shared concept (checkbox also keeps its group spacing and top and bottom edge records). Across the corpus the picture is different: grouped by `(component, property, part, between)`, 203 of 1,452 groups hold more than one context. That is an upper bound, since only 445 records have a part today, but it says role and qualifier still do work outside these two components.
6. **A `between` could not replace one qualifier.** The position list has `top` but not `top-edge`, so "top edge to control" is `{ from: top, to: control }` and SPEC-090 would derive "top to control". The 8 records keep their qualifier. This is the case for rule 2's "only what none of the above can say".
7. **No single place loads recipes.** The CLI, WASM, TUI and manifest loader each set `graph.visuals` themselves, so rewriting selectors once at load is not available. That is why the matcher has several callers and the spec sheet lowers a copy.
8. **Rule text is part of the contract.** SPEC-062's message is in `rules.yaml` and in a conformance fixture. The structured selector needed its own messages; the `context` one stays word for word.
9. **Compatibility.** A WASM or CLI build older than this one cannot resolve the new switch and checkbox recipes. The changeset says so, and the data needs a WASM patch release.

## Deprecation sequence

1. **Engine and schema first.** Land the matcher, the selector schema and the rule changes with no data change. Old and new selectors both work. The CLI release (Cargo version bump) and the WASM patch go out before data that needs them.
2. **SPEC-090 stays advisory while both forms exist.** It checks that an authored `context` agrees with the role, and now with a `between`. It stops being the way two fields are kept in step, because recipes no longer read the string.
3. **Split the role vocabulary.** Move the 20 anatomy words out of `relationship-contexts.json`'s role list. A record whose role is one of them takes `scope.part` where the component declares the part (1,680 records are affected, so this goes component by component), and keeps the role only when it is a shared concept (rule 3). Records on components that do not declare the part stay as they are until the anatomy is reviewed.
4. **`contextPart` deprecation.** Backfill `scope.part` from it, per the table above, then mark the field deprecated in the schema and make SPEC-090 flag a record that still carries it. Remove it in the next major.
5. **Recipe migration, smallest first.** switch and checkbox (this spike), then the recipes with a few bindings, then badge (145 token selectors, the qkj5.11 case), button (86), action-button (35). Each migration is one recipe with a before and after render comparison like the one above.
6. **Qualifiers to `between`.** 770 `contextQualifier` values are "X to Y". Move them to `scope.between` where the ends are positions, generic anatomy terms or declared parts (SPEC-101). A new advisory flags a record that has both a `between` and a qualifier saying the same thing. The other 890 qualifiers (`non-semantic` 114, `default` 89, `minimum` 72, `semantic` 66, `size` 65, ...) are reviewed by kind: a `size` qualifier on a `size` record goes, `minimum` and `maximum` may need a place.
7. **Note-like contexts.** About 20 contexts are design-sheet notes. Move them to `notes` or `description`, give the record a real identity, and drop them from SPEC-091's list of unregistered main words.
8. **Last.** Once no recipe in the foundation binds by `context`, SPEC-092 requires a record to be reachable by identity, not by a context, and SPEC-093 (option qualifiers out of contexts) is a relabelling step, not a source of ties.

An identity command is a follow-up, not part of the spike: `design-data` would print each record's identity line for a component, so duplicates and gaps are visible. The line itself exists (`relationship_identity`) and SPEC-062 already uses it.

## Changelog and option-tie grouping

* **Changelog.** `changelog.rs` classes a change to a relationship's `context` as documentation and a change to `value`, `$ref` or `sets` as visual. That already treats the string as a label. A change under `scope` falls to the default and classes as metadata, so a `scope.part` or `scope.between` edit, which can re-point a recipe, would not count as visual. That needs a decision and a test.
* **Option ties.** `relationship_option_ties` groups records by `(component, property, context)`, and its baseline passed unchanged on the spike because no `context` changed. It should group by the identity line, and the baseline will move: records that share a label but differ in identity stop being counted as one group, and records that differ in label but share identity start being counted together. The moved numbers must be reported, not absorbed.

## The Figma label round trip

The Figma variables export and the plugin never read `context`; checked in `sdk/plugins/figma`, and the plugin tests pass unchanged. The spec text that calls `context` a "Figma Token Group label" refers to the S2 Token Specs Figma file, which is deprecated.

The spec-sheet generator is the real consumer. It titles each block from `context` and builds the block id from that title, so a changed label renames and re-ids a block in a generated Figma spec file. The spike changed no label, and the sheets were identical. Moving a label to a structured wording is a change a designer will see in the sheet and needs a release note.

## Questions for you

1. **Shared concepts.** A record used by several parts has no part, so it keeps an anatomy-word role (`control`). Is that acceptable, or should the component declare a part for the whole control (`control`), or should a selector be able to say "no part"?
2. **Bare selectors.** 32 of 52 bindings are `{property}` alone. Allow them (shortest, and SPEC-062 catches a later collision), or require at least one structured field so the binding says what it is about?
3. **Split the registry?** Remove the 20 anatomy terms from the role list and make `part` the only home for them. That is the clean version of rule 1, and it is also the biggest migration (1,680 records).
4. **Vocabulary for "top edge".** The position list has `top`, `bottom-edge`, `start-edge` and `end-edge` but not `top-edge`. Add `top-edge`, or keep the qualifier?
5. **How much of the label may change?** Should the migration regenerate every label from the structure where it can (and rename the sheet blocks), or only labels that change anyway?
6. **`contextPart` values that are not declared parts** (`drag handle`, `outline`, `cell`): add them to the component's anatomy, drop the field, or leave them as a label?
7. **Release.** The data change needs a WASM patch and a CLI minor. Should the engine ship alone first, as step 1 above?
