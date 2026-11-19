<!-- Copyright 2026 Adobe. All rights reserved. -->

# Proposal 018: Name a relationship by its part or its gap, not its `context` string

**Status:** Draft. Direction updated 2026-11-19 (see [Direction](#direction-2026-11-19)); some questions are answered there and the rest remain open. A spike on switch and checkbox is built on the unmerged branch `spike/structured-ctr` (based on `feat/retire-token-bindings`, PR 1948). Nothing else is migrated. Breaking changes and a large migration are accepted for this proposal. A change to `@adobe/spectrum-tokens` is not (see [Constraint](#constraint-no-change-to-adobespectrum-tokens)).\
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

A relationship's identity to a recipe is:

```
(scope.property, scope.part, scope.between)
```

| Field            | Holds                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| `scope.property` | what is styled                                                                                               |
| `scope.part`     | the anatomy part that owns the value, a part the component declares (SPEC-052)                               |
| `scope.between`  | the two ends of a gap, `{ from, to }`, each a position, a generic anatomy term or a declared part (SPEC-101) |

Every record a recipe binds **MUST** have a `part` or a `between`. `scope.options` still pick among records of one identity at solve time and are not part of the key.

`contextRole`, `contextQualifier` and `context` are not identity. They are inputs to the display label, below.

**Superseded by Direction (per-record part): a part is the owner of the concept, not the part that draws it.** This is how the spike worked. The spike found a token concept that the switch handle (twice) and the track (once) all bind: "Control color". The component's anatomy review had already removed `control` as "a grouping with no style of its own", moving its size to `track` (switch) and `box` (checkbox). So the record's part is `track` or `box`, the part that replaced the grouping, and the handle's binding names `{ property: color, part: track }`. A recipe part may bind another part's identity. This is a judgment per component, and the proposal does not re-add a grouping part to the anatomy (see the questions).

### The selector

A recipe selector names the fields it needs with the record's own field names:

```json
{ "relationship": { "property": "background-color", "part": "handle" } }
{ "relationship": { "property": "space-between", "between": { "from": "control", "to": "label" } } }
```

It **MUST** name at least one of `part` and `between`, and the schema rejects a selector that names neither. Matching is by subset: a selector matches every record whose given fields equal the record's, and a field it leaves out is not compared. A selector **MUST** name exactly one identity. SPEC-062 reports one that names several, with each identity on a line:

```
Selector {"property":"color"} names 2 relationship identities for 'switch':
  color / focus-indicator / -; color / track / -
```

An identity line is `property / part / between`, with `-` for a field the record lacks.

`context` selectors keep working with the same meaning during the migration. A selector with both `context` and a structured field is invalid. `contextRole` and `contextQualifier` are not selector fields.

### The role vocabulary

*Current state during migration. The Direction section overrides this: `contextRole` is derived from the property where implied and `contextQualifier` is retired, with the details open (questions 8 and 10).*

Split `registry/relationship-contexts.json`. A role is a kind of thing: the 14 non-anatomy terms (`spacing`, `background`, `border`, `size`, `rounding`, `height`, ...). The 20 anatomy words (`label`, `icon`, `control`, `track`, ...) are parts and belong in `scope.part`. A record on a component that declares the part takes it there and drops the anatomy-word role. A qualifier stays only when neither `part` nor `between` can say it (`down`, `top edge to control`).

SPEC-090 becomes an error for an anatomy word in `contextRole` once the migration is done. Until then it stays advisory.

### `context` is a display label

*Current state during migration, not the target. The Direction section treats authored labels as debt, generated from identity where possible.*

`context` stays on the record as the label a person reads: the spec sheet block title, the wording the Figma sheet follows, a changelog line. Nothing binds on it once recipes have moved. Where a record has no `context`, the label is generated:

* With a `contextRole`: the role labels joined (`A`, `A and b`, `A, b, and c`), then ` (qualifier)`, or ` (from to to)` for a `between`. This is SPEC-090's rule, plus the `between` bracket the spike added.
* Without a role: the part's name, `handle` as `Handle`.

An authored `context` is checked by SPEC-090 against the role only. A label may change when it moves to the structure's wording. A changed label renames and re-ids a spec-sheet block, so it is a data change with a release note.

### `contextPart`

Deprecate it. `contextPart` holds real part names (`Dot` on 75 records, `menu item` on 8, `track` on 8, `tree view item` on 7) and none of the 119 values is an "X to Y" form, so the move is `contextPart` to `scope.part`. The 117 records without a `scope.part` need a decision each: the value must be an anatomy part the component declares, and a few such as `drag handle` or `outline` may not be.

### Recipe binding standard

The `visual-recipe-binding-standard` decision (2026-10-29) says a recipe binds through the component's relationships by default, and a platform-owned component may bind platform tokens directly. This proposal changes neither half. It changes how a relationship is named. The 233 of 266 token selectors in badge, button and action-button that already match a relationship's token move to a structured relationship selector, not to a `context` one. The qkj5.11 question (badge font relationships have no context, so is context mandatory) goes away.

## Constraint: no change to `@adobe/spectrum-tokens`

`packages/tokens/src` is generated from `packages/design-data/tokens` plus `relationships` by `design-data:legacy-output`, and `tokens:verifyLegacyOutput` also hashes `registry/` and `fields/`. So a relationship or registry edit can reach the package. The spike was checked against that:

* Regenerating the legacy output after the spike leaves `packages/tokens` unchanged, and `tokens:verifyLegacyOutput` passes.
* The changeset lists `@adobe/design-data-spec`, `@adobe/spectrum-design-data` and `@adobe/design-data-wasm`, not `@adobe/spectrum-tokens`.

Every later step carries the same gate: run `design-data:legacy-output`, require no diff under `packages/tokens`, and run `tokens:verifyLegacyOutput`. Only `registry/relationship-contexts.json` changes in the vocabulary split. The registries and fields that name tokens (property, anatomy and variant terms, `fields/`) are not edited. Whether `relationship-contexts.json` feeds the legacy output at all is not yet verified, so the split's first step is to check that.

## Spike

Switch and checkbox only. Tests and builds ran one after another.

What changed:

| Item                                                                    | Switch     | Checkbox  |
| ----------------------------------------------------------------------- | ---------- | --------- |
| Relationship records changed                                            | 112 of 152 | 94 of 111 |
| `scope.part` added                                                      | 80         | 78        |
| `scope.between` added                                                   | 16         | 16        |
| role dropped (a part now says it)                                       | 84         | 67        |
| qualifier dropped                                                       | 37         | 17        |
| Recipe bindings rewritten                                               | 30         | 22        |
| of those, naming a `part` or a `between` (all of them name exactly one) | 30         | 22        |
| Recipe lines before, after                                              | 247, 211   | 411, 366  |

`context` strings were not touched, so no block id moved. No new registry term was added and no anatomy changed: `control`, `label` and `top` are in the anatomy and position vocabularies, and every part used is declared. One record has no part or `between` and needs a decision: checkbox "Checkbox group spacing (horizontal)", a gap between checkboxes that the checkbox's own anatomy does not describe.

Schema and engine, 8 Rust files in all, 334 lines added and 55 removed (about 140 of them tests), plus the schema and spec text:

* `component-visual.schema.json`: `relationshipSelector` gains `part` and `between`, requires one of them unless it uses `context`, and refuses both together with `context`.
* `scope.rs`: the subset matcher and `relationship_identity`, about 50 lines.
* `visual.rs`: the resolver takes a structured selector, `recipe_options_in` and the miss message read it, and `with_context_selectors` lowers a recipe to `context` form.
* SPEC-062 gains the one-identity check; SPEC-066 and SPEC-071 call the matcher; SPEC-090 derives the `between` bracket. `RelTarget` carries its record.
* `spec_sheet.rs` calls `with_context_selectors` once, so its four `context` readers needed no change.

Results:

* The renderer reads the same data after the change. 3,072 states (both components, all sizes, both color schemes, both scales, every option combination and the hover, down and keyboard-focus states) gave 6,144 files, SVG and scene JSON, byte-identical to before. The spec sheets are byte-identical, with and without `--svg`.
* `moon run design-data:validate` and `design-data:validate-visuals` pass. `moon run sdk:test` passes, 2,301 tests, with the recipe-lint and option-tie baselines unchanged and no baseline raised. `design-data-figma` (137), `cli_figma_export` and `cli_spec_sheet` pass.
* Schema negatives, run against the real recipe with one selector broken at a time: `context` with `part` fails, a bare `{ property }` fails, a `contextRole` key fails, and `context` alone still passes. A selector that names two identities is reported by SPEC-062, and one that names none is reported with the selector.
* `@adobe/spectrum-tokens` unchanged, as above.

What did not work, or surprised me:

1. **Role and qualifier were not needed for identity here.** Grouping the 207 switch and checkbox records that bind a token by `(property, part, between)` gave 81 groups, and no group holds more than one context, role or qualifier. So the selector can drop both and the records keep them as label inputs. This was measured only on two components. Across the corpus, before parts are backfilled, 203 of 1,452 `(component, property, part, between)` groups still hold more than one context, and only 445 records have a part. The same count is the gate for each component's migration: if a group does not separate, the component needs more structure (a part or a `between`), not a selector field.
2. **The grouping part was already removed on purpose.** The recommended fix for shared concepts was a declared `control` part. Both components' anatomy reviews say `control` was removed as "a grouping with no style of its own". So the owner rule above replaced it (replaced by a per-record part, see Direction). SPEC-060 only checks that a recipe part is declared, not the reverse, so a grouping part would have been allowed, but it would undo a review decision.
3. **Generated labels do not reproduce today's strings, and the structure makes that worse.** Deriving from role plus qualifier equals the stored `context` on 2,928 of 4,702 records (62%). On the spike data, a part-first generator matches 39 of 112 switch contexts and 42 of 95 checkbox ones. The rest differ in wording, not meaning: `Handle (size)` gives `Handle`, `Control` gives `Track` or `Box`, `Font size` gives `Label`, `Focus ring` gives `Focus indicator`, `Minimum height` gives `Height`. That is the label cost the owner accepted. It is why `context` is still an authored field during migration; the target is generated labels (see Direction).
4. **A bare selector is rejected, and the recipes got longer for it.** The first strict-less version let 32 of 52 bindings be `{ property }` alone, which made switch 199 lines. Requiring a part costs one short field each (211 lines) and says what the binding is about. Both are shorter than the original 247 and 411.
5. **Subset matching cannot select a part-less record when its property also has records with a part.** With a mandatory part or `between` this no longer comes up, which is a reason to keep the rule mandatory.
6. **A `between` could not replace one qualifier.** The position list has `top` but not `top-edge`, so "top edge to control" is `{ from: top, to: control }` and SPEC-090 would derive "top to control". The records with "top edge" wording keep their qualifier.
7. **The recipe schema is checked by a separate task.** `design-data validate --visuals-path` accepted every broken selector in the negative runs, while `design-data:validate-visuals` (AJV, which applies `component-visual.schema.json`) rejected them. A rule enforced only in the schema is only as strong as that task being in CI.
8. **No single place loads recipes.** The CLI, WASM, TUI and manifest loader each set `graph.visuals` themselves, so rewriting selectors once at load is not available. That is why the matcher has several callers and the spec sheet lowers a copy.
9. **Rule text is part of the contract.** SPEC-062's message is in `rules.yaml` and in a conformance fixture. The structured selector needed its own messages; the `context` one stays word for word.
10. **Compatibility.** A WASM or CLI build older than this one cannot resolve the new switch and checkbox recipes. The changeset says so, and the data needs a WASM patch release.

## Direction (2026-11-19)

**Where this section conflicts with the sections above, it overrides them.** In particular, `contextRole` and `contextQualifier` are not live selector or identity inputs (the role vocabulary and qualifier steps below describe the migration path, not the end state), and the owner-part rule is replaced by a part on each record.

These points refine the proposal and follow the shared [data principles](../../.ai/rules/data-principles.md). They are the stated direction, not new measurements.

* **Root part.** While a component migrates, a record that describes the component as a whole names an explicit root part. Once the component reaches the structured-identity level, the root part is implicit and omitted.
* **Property names carry no endpoints or anatomy.** A gap is `space-between` with `scope.between`, and a size variant is an option, not a suffix on the property name.
* **Identity includes `attribute`:** `(property, attribute, part, between)` (Garth, 2026-11-19, from the qkj5.248 chat with Nate). Where this proposal says `(property, part, between)`, read the four-field key.
* **`contextRole` is derived from the property** where a tightly coupled property implies it (`space-between` is never a color). It is authored only for exceptions. Measured on 2026-11-19 (bead 5m92.17): 1,326 live records agree, 28 disagree and all 28 are wrong data (fixed in the 5m92.19 PRs). `color`, `opacity` and fused names in `scope.property` carry no derivable role until split; `color` waits for Nate's reply.
* **`contextQualifier` is retired.** Its content moves to `options`, `between` or `part`; what fits none becomes a `needs-decision` bead. Measured destinations: `between` 856, option 273, already in the property (drop) 173, state 109, `default` (drop) 88, part 13, 57 left over. Nate's taxonomy has a "property constraint" field that is the likely home for `minimum` and `maximum`.
* **Per-record part.** Each drawing part gets its own record pointing at the shared token; there is no owner part. A shared token is two design decisions that agree, not one.
* **Authored labels are debt.** Labels are generated from identity where possible, and spec-sheet block ids come from identity, not from the label string. Spec sheets may later become a plugin or formatter over visual recipes, so labels carry little weight.
* **Decision references stay out of published data.** Beads list the affected record UUIDs; records do not point at beads.
* **Legacy and Figma names are generated outputs** of the name object (principle 6). Hand-written names and `legacyKey` pins are counted migration debt, and each migration step should report how many remain.

## Deprecation sequence

*Migration path only. Steps 3, 6 and 8 describe moving from today's fields; where they differ from Direction (role derived, qualifier retired), Direction is the end state.*

Each step carries the tokens gate above.

1. **Engine and schema first.** Land the matcher, the selector schema and the rule changes with no data change. Old and new selectors both work. The CLI release (Cargo version bump) and the WASM patch go out before data that needs them.
2. **SPEC-090 stays advisory while both forms exist.** It checks that an authored `context` agrees with the role, and now with a `between`. It stops being the way two fields are kept in step, because recipes no longer read the string.
3. **Split the role vocabulary and backfill parts, component by component.** For each component: declare or confirm the parts, move each record's anatomy-word role to `scope.part` by the owner rule, move "X to Y" qualifiers to `scope.between`, then run the identity count. A group that holds more than one context is a finding to resolve with data, not a reason to put role back in the selector. The 1,680 records with an anatomy-word role are the bulk of it. Components that do not declare the part wait for an anatomy review.
4. **`contextPart` deprecation.** Backfill `scope.part` from it, per the table above, then mark the field deprecated in the schema and make SPEC-090 flag a record that still carries it. Remove it in the next major.
5. **Recipe migration, smallest first.** switch and checkbox (this spike), then the recipes with a few bindings, then badge (145 token selectors, the qkj5.11 case), button (86), action-button (35). Each migration is one recipe with a before and after render comparison like the one above.
6. **Qualifiers.** 770 `contextQualifier` values are "X to Y" and go to `between`. A new advisory flags a record that has both a `between` and a qualifier saying the same thing. The other 890 (`non-semantic` 114, `default` 89, `minimum` 72, `semantic` 66, `size` 65, ...) are reviewed by kind: a `size` qualifier on a `size` record goes, `minimum` and `maximum` may need a place.
7. **Note-like contexts.** About 20 contexts are design-sheet notes. Move them to `notes` or `description`, give the record a real identity, and drop them from SPEC-091's list of unregistered main words.
8. **Flip the rules.** Once no foundation recipe binds by `context`: the part-or-between requirement applies to every record a recipe binds, SPEC-090 errors on an anatomy word in `contextRole`, SPEC-092 requires a record to be reachable by identity, and SPEC-093 (option qualifiers out of contexts) is a relabelling step, not a source of ties.

An identity command is a follow-up, not part of the spike: `design-data` would print each record's identity line for a component, so duplicates and gaps are visible. The line itself exists (`relationship_identity`) and SPEC-062 already uses it.

## Changelog and option-tie grouping

* **Changelog.** `changelog.rs` classes a change to a relationship's `context` as documentation and a change to `value`, `$ref` or `sets` as visual. That already treats the string as a label. A change under `scope` falls to the default and classes as metadata, so a `scope.part` or `scope.between` edit, which can re-point a recipe, would not count as visual. That needs a decision and a test.
* **Option ties.** `relationship_option_ties` groups records by `(component, property, context)`, and its baseline passed unchanged on the spike because no `context` changed. It should group by the identity line, and the baseline will move: records that share a label but differ in identity stop being counted as one group, and records that differ in label but share identity start being counted together. The moved numbers must be reported, not absorbed.

## The Figma label round trip

The Figma variables export and the plugin never read `context`; checked in `sdk/plugins/figma`, and the plugin tests pass unchanged. The spec text that calls `context` a "Figma Token Group label" refers to the S2 Token Specs Figma file, which is deprecated.

The spec-sheet generator is the real consumer. It titles each block from `context` and builds the block id from that title, so a changed label renames and re-ids a block in a generated Figma spec file. This is current behavior; Direction says block ids are to come from identity, so this is to be changed. The spike changed no label, and the sheets were identical. Moving a label to a structured wording is a change a designer will see in the sheet and needs a release note.

## Questions for you (open)

1. **Answered (B3):** per-record part, no owner part. Original text: **The owner rule.** For a shared concept the part is the owner, found from the anatomy review (`track`, `box`). For components with no such note, who decides the owner, and is a wrong choice recoverable? The alternative is a part on each record, with no owner. Not decided. A wrong owner changes no rendering, since any part may bind it, but it changes the identity line.
2. **Checkbox group spacing.** One record, a gap between checkboxes, has no part or `between` of the checkbox. Give it `between: { from: checkbox, to: checkbox }` (`checkbox` is an anatomy term), move it to a `checkbox-group` component, or leave it as the one exception?
3. **Corpus count and fallback.** Direction settles that role and qualifier are not selector fields, and `attribute` is in the key. Still open: the corpus-wide identity count (not run yet), and whether a fallback field is needed for a group that does not separate.
4. **Vocabulary for "top edge".** The position list has `top`, `bottom-edge`, `start-edge` and `end-edge` but not `top-edge`. Add `top-edge`, or keep the qualifier?
5. **Answered (B4):** labels are generated and block ids come from identity, but when the block ids change is not recorded. Original text: **Regenerate labels now or later?** Regenerate every label from the structure where possible now (renaming sheet blocks), or only labels that change anyway.
6. **`contextPart` values that are not declared parts** (`drag handle`, `outline`, `cell`): add them to the component's anatomy, drop the field, or leave them as a label?
7. **Release.** The data change needs a WASM patch and a CLI minor. Should the engine ship alone first, as step 1 above?
8. **`contextRole` derivation.** Answered in principle (B1): derive it where a tightly coupled property implies it, author it for exceptions. Still open: the property list to ship (the 5m92.17 tight rule is the candidate), and `color`, `opacity` and fused names, which wait for the property split and Nate.
9. **Root part cut-over.** What exactly marks a component as having reached the structured-identity level, and when the explicit root part is dropped. Not decided.
10. **`contextQualifier` values with no home.** Answered (B2): they become `needs-decision` beads, 57 records in 4 groups (5m92.17). Open: whether `minimum` and `maximum` go to a property-constraint field.
