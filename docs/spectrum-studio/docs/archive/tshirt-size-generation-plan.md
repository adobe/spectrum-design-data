# T-shirt size generation and Structure application plan

## Approval and scope

The user confirmed D-01 through D-20 individually and subsequently requested
implementation of this two-part architecture slice. This document replaces the
earlier provisional draft with those confirmed decisions. Implementation is
separate from upstream architecture, schema-extension and RFC acceptance.

The purpose is to author reusable rules and apply them to Structures, producing
semantic tokens from the existing foundation generators. It contributes to
EPIC-5.1/5.3 and EPIC-4.2/4.3/4.4, with shared Registry and EPIC-7.1/7.3
dependencies. It does not complete a general rules engine, option groups,
component anatomy/composition, product presets, direct semantic overrides or
full upstream convergence.

`componentSize` remains in Typography pending EPIC-2.5. The new semantic Size
classification is not a mode or a product-default field. No extra component-size
or text-zoom shift is applied to Structures. Size, Spacing and Radius remain
independent of text zoom unless their source explicitly declares a binding.

## Confirmed decisions

| ID | Decision | Behavior |
| --- | --- | --- |
| D-01 | Scope | Bounded architecture slice for this rule and Structure applications. |
| D-02 | Movement | Available-token positions by default; numeric scale-index offsets are a separate explicit method. |
| D-03 | Sizes | XS/S/M/L/XL. Medium is required, initially the only enabled size, with fixed offset zero. |
| D-04 | Hidden sources | Exact literals stay generated and update with their source and relevant context; they are not frozen copies. |
| D-05 | Padding equivalence | Compare source reference and complete derivation, not today's numeric value. Complete matching sides or opposite pairs can group. |
| D-06 | All | Includes newly eligible token-backed properties; Custom retains stable binding IDs. |
| D-07 | Applications | Multiple applications must be disjoint. No stacking, replacement or order-dependent winner. |
| D-08 | Names | Governed Structure and Registry terms plus a declared formatter; no freeform template editor. |
| D-09 | Feature pin | `eba428d462bfb5a3288835cb6cf0dcb1c4dc93af`; unrelated older profiles keep their pins. |
| D-10 | Positions | Physical left/right/corners remain explicit vocabulary extensions, not implicit logical start/end conversions. |
| D-11 | Preview | Enabled sizes appear side by side in Structures Permutations. Design edits Medium anchors; the sample app is unchanged. |
| D-12 | Stories | Approved for the rule editor, application dialog and Permutations only. |
| D-13 | Overrides | Honor source overrides; defer direct individual semantic-size overrides to EPIC-5.4. |
| D-14 | Enabled-size owner | One enabled-size set per Structure, shared by all its applications. |
| D-15 | Mapping owner | All five offsets belong to each reusable rule; no application-local offset override. |
| D-16 | Missing requested target | Use nearest available with a visible warning at boundaries and interior numeric gaps. |
| D-17 | Nearest tie | Lower index for decrement; higher index for increment. |
| D-18 | Partial groups | Complete selected opposite padding pairs can group. Unmatched sides/corners remain individual. |
| D-19 | Concept/schema conflict | Schema-valid row UUIDs in token records; concept IDs in separate lineage. |
| D-20 | Named scales | Declare the existing Registry `foundationScale` field as an extension; numeric steps still drive traversal. |

## Authoring workflow

1. Open **Logic**, select **Rules**, and use the shipped **T-shirt sizing** rule
   or **Add rule** to create another. Choose **T-shirt sizing**, select the
   movement method and edit the offsets. A representative Medium token lets
   you inspect the mappings without attaching the rule to that token.
2. Open **Design**, select a Structure and choose its enabled sizes. Use
   **Add generation rule** to select a reusable rule and either all token-backed
   properties or a custom selection. Review the generated names and warnings,
   then apply. Medium always remains enabled.
3. Use **Permutations** to inspect the enabled sizes. **Tokens** shows their
   generated values, primitive references and source/rule details. Its generated
   token bundle download uses the pinned format, independently of the Registry's
   current display-name order.
4. Edit foundations, Structure assignments or reusable rules to change generated
   output; individual generated tokens are read-only. **Save** stores the
   authoring baseline. **Cancel** restores the last Save, and removing an
   application supports **Undo**.

Fresh shipped data includes **Base**, with all five sizes and an All application
of the adjacent-token rule. It starts with Hug dimensions, no constraints,
left/top alignment, `spacing-base-gap-100` for Gap,
`spacing-base-horizontal-100` for left/right padding, and uniform `radius-100`
corners. Top/bottom padding and elevation are unassigned. These produce 15
semantic concepts using live hidden-spacing literals and published-radius
aliases. Existing saved designs are preserved; Reset all loads the shipped
defaults and discards existing authoring edits. `test:base-structure-defaults`
checks the exact UUID references, generated output and baseline/revert behavior.

## Part 1: Rule and generation

### Native rule contract

Rule schema version two extends the existing discriminated union, retaining
rounding behavior, IDs, deletion/Undo and fallback. Rounding consumers and
pickers only accept rounding rules. A missing or wrong-type generation rule
fails explicitly rather than falling back to Whole numbers.

```typescript
interface TshirtSizingRule extends RuleBase {
  type: "tshirt-sizing";
  movement: "available-token" | "scale-index";
  mappings: { termId: string; offset: number }[];
}
```

Exactly five stable size-term references and signed safe-integer offsets are
required. Medium's offset is zero. The rule owns no anchor, enabled-size set or
copied Structure program. Changing a new draft's type initializes the correct
body; referenced rules cannot silently change type.

| Size | Available-token default | Scale-index default |
| --- | ---: | ---: |
| Extra small | -2 | -200 |
| Small | -1 | -100 |
| Medium | 0 | 0 |
| Large | 1 | 100 |
| Extra large | 2 | 200 |

Available-token movement follows the source's mathematical sequence. Numeric
movement adds the offset to its generated scale index, then looks for the
nearest existing step. Neither method changes the primitive's numeric value.
Irregular steps such as 50/75/100 intentionally produce different results.

Resolve within the same family and source UUID using mathematical index and
generated step, never names, menu order or rounded values. Keep requested and
actual mappings distinct. Boundary reuse does not merge semantic sizes.
Do not interpolate, wrap, extend source ranges or switch methods/sources.
Invalid offsets, ambiguous indices, nonfinite/invalid source values, missing
anchors/sources and empty eligible sources are blocking errors.

### Shared generation and output

`buildTshirtArtifacts` is the authoritative synchronous generator. It reuses
the existing dimension and complete-Elevation generators, Registry owners,
mode resolution, primitive identity bridge and UUID helper. Supported source
families are Size, Spacing, Radius and complete Elevation levels; Typography
and Color adapters are not part of this feature.

| Resolved target | Emitted semantic row |
| --- | --- |
| Published | `$ref` to a real emitted primitive row UUID, with no `value`. |
| Hidden | Exact literal `value`, with no `$ref` and no hidden primitive row. |
| Nearest valid | Same publishing policy, with visible requested/actual warning. |
| Invalid | No partial successful bundle or last-good-current substitution. |

Dimensions use lossless finite nonnegative px strings, such as `"20px"`, not
display-rounded numbers. Radius additionally retains raw/rounded nonnegative
validation. Complete outset shadow arrays retain exact ordered geometry and
alpha-bearing color literals. Source overrides are evaluated in their authored
contexts; generated literals are not manual overrides.

Published targets accompany the bundle. Authoring reference UUIDs, browser IDs,
concept IDs and emitted row UUIDs are distinct, joined through typed source,
mathematical index and context evidence. Do not copy an authoring UUID into an
exported alias.

Semantic concept identity is based on Structure UUID and canonical generated
classifications; row identity adds its emitted context. Names, values, visibility,
application IDs and equivalent rule IDs do not change identity while grouping
topology is unchanged. Splitting/merging groups creates additions/removals.

### Pinned profile

`spectrum-design-data-tshirt-subset-v1` records schemas, fields, vocabulary,
license and SHA-256 provenance at the feature pin. Design-data package 3.4.0
and spec package 4.5.0 describe format `1.0.0-draft`.

```json
{
  "uuid": "e44ec987-7634-4817-8f3b-82460aa7e1be",
  "name": { "structure": "base", "property": "padding", "size": "m" },
  "$ref": "6b336cc2-9cd4-45a1-aeb8-8ebc1760420c"
}
```

The example formats as `base-padding-medium`; UUIDs are illustrative. Hidden
20px output uses `"value": "20px"` instead of `$ref`. XS/S/M/L/XL use canonical
IDs `xs/s/m/l/xl` and formatted words
`extra-small/small/medium/large/extra-large`.

Validate the closed envelope, applicable values, declared field/vocabulary and
mode values, UUID/structured/formatted-name uniqueness, target existence/types
and cycles. Separate lineage stores concept, binding, source and rule provenance.

Continuing limits are explicit:

- Token prose requires `conceptId`, but the closed schema rejects it. Row
  references plus separate lineage do not resolve the prose/SDK conflict.
- The field catalog declares numeric `scaleIndex`; additional token-name fields
  accept strings and upstream legacy formatting excludes it. This subset uses
  decimal-string serialization and explicitly includes it in its formatter.
- `foundationScale` and physical sides/corners are declared extensions, not
  already accepted upstream vocabulary.
- No dedicated dimension value schema exists at this pin. Local px validation
  does not invent an upstream `$valueType` URI.
- Local schema/graph results do not prove full SDK, cascade, dataset, continuous
  adaptive-runtime, manual architecture or RFC acceptance.

Native taxonomy export, proposed dimension artifacts and this pinned bundle
remain distinct. The separately user-directed canonical-taxonomy feature makes
app semantic names follow Registry order/inclusion, without overwriting this
pinned serializer or claiming revised native names conform to its profile.
The older shadow profile retains
`838a6835b746f9d77b2697374408901f334d854e`.

### Context and Logic editor

Emit only contexts required by each selected source's explicit bindings or
value assignments. Equal explicit assignments remain distinct; unrelated
declared modes and Cartesian evaluation samples do not multiply semantic rows.
Structure sizes are not a mode axis. Temporary adaptive values and preview
measurements do not write exported or saved rows.

Logic's existing Type picker enables T-shirt sizing. Public S2 controls edit
movement and the five offsets, explaining the fixed Medium anchor and
Structure-owned sizes. A temporary representative token drives mapping examples,
including Alias/Literal and requested/actual warnings, without binding the rule
to that token. Used by identifies attached Structures.

## Part 2: Structure application

### Authoring contract and dialog

Structures schema version two preserves the existing concept UUID and exact
native slot classifications, adding separate generation intent:

```typescript
interface StructureGeneration {
  nameRef?: TaxonomyNameReference;
  sizeTermIds: string[];
  applications: StructureRuleApplication[];
}
interface StructureRuleApplication {
  id: string;
  ruleId: string;
  targets: { kind: "all" } | { kind: "custom"; bindingIds: string[] };
}
```

Each card exposes shared Generate sizes and Add/Edit/Remove generation rule.
Read-only cards retain summaries without mutation controls. Existing selection,
required names, delete/Undo and keyboard behavior remain.

The S2 dialog starts on All and stages its compatible rule, target selection,
generated names, Alias/Literal output and diagnostics. It groups properties as
Default size, Constraints, Gap, Padding, Corner radius and Elevation. Existing
token tags show current sources. Hug/Fill, alignment terms and unset fields
are excluded with explanations. No rule/eligible source yields a clear empty
state; overlaps, output collisions and invalid targets block Apply.

Apply commits only after coherent generation validates. Cancel writes nothing.
A stable provisional Structure-term UUID is reused by preview and Apply,
without registering it on Cancel. Emitting names register/reuse compatible
Registry terms; global ownership collisions do not trigger auto-transfer,
suffixing or destructive repair.

All follows newly token-backed properties. Custom retains stable binding IDs
and does not expand. Missing or no-longer-token-backed Custom targets remain
visible, deselectable repair intent rather than being silently removed.
Applications must stay disjoint after later edits.

### Classifications and grouping

Reuse existing Property, Position, Constraint and Axis identities. Existing
Axis terms adapt to emitted `orientation`; do not create another category.
Generated classifications remain separate from exact native slot combinations.

| Native setting | Emitted property |
| --- | --- |
| Width / Height | `width` / `height` |
| Minimum / Maximum dimensions | `min-width`, `min-height`, `max-width`, `max-height` |
| Gap | `gap` |
| Padding | `padding`, optional orientation/physical position |
| Radius | `corner-radius`, optional physical corner |
| Elevation | `shadow` |

Grouping compares selected membership, same source, movement method and all
five mappings, including disabled sizes, across emitted contexts. Equivalent
rule IDs may group; equal current values or nearest targets alone may not.

| Padding pattern | Groups | S/M/L concepts | Five-size concepts |
| --- | ---: | ---: | ---: |
| Four equivalent sides | 1 | 3 | 5 |
| Two equivalent opposite pairs | 2 | 6 | 10 |
| One equivalent pair plus two unmatched sides | 3 | 9 | 15 |
| No equivalent opposite pair | 4 | 12 | 20 |

Only complete selected opposite pairs group in partial selections. Corners
group only when all four selected corners are equivalent; otherwise they remain
individual. No three-side, diagonal or invented corner-orientation groups.
Untargeted properties stay at their base values.

### Integrated surfaces

Design remains the Medium-anchor editor on pasteboard. Structures Permutations
uses the shared generated assignments and existing `StructurePreview`/resolution
helpers, with stable XS/S/M/L/XL headings, independent geometry measurements,
responsive layout and per-size nearest warnings. It does not rewrite anchors,
change the sample app or introduce a size selector in Design.

The existing Tokens browser, search, Alias column and details show semantic
origin, source/rule lineage, exact literals and warnings. Generated rows are
read-only at both UI and mutation boundaries. Edit their foundations, Structure
anchors/applications or reusable rules; direct semantic overrides remain deferred.

Download generated token bundle is explicitly separate from native taxonomy
export. The bundle includes required published targets, declared profile,
separate lineage and diagnostics.

### Persistence, dependencies and reporting

This feature introduced authoring envelope version five under the unchanged
`leonardo:authoring:v1` key. The separately user-directed taxonomy extension
layers version six on top, retaining the Structure/rule and cache contracts.
Known versions one through four upgrade working/saved independently. Existing
Structures stay unattached with Medium enabled. Missing/invalid current data
is preserved with errors rather than silently defaulted.

Save validates generation before writing or advancing the baseline. Cancel
restores last Save; Reset all restores shipped defaults. Application/Structure
Remove and Undo restore identities/dependencies. Referenced generation-rule
deletion is blocked; rounding deletion/Undo retains its existing fallback.
Generated Changes direct reverts to source rather than mutating tokens.

The rebuildable cache uses `leonardo:artifacts:tshirt:v1`, version one, source
and result SHA-256 hashes, reconstructed-output checks and a 5 MB result limit.
Freshness includes profile, Registry, Structures, rules/formulas, foundations,
modes and browser edits, excluding temporary previews. Invalid/mismatched cache
is diagnosed and rebuilt; older asynchronous hashing cannot replace newer work.
Cache errors are separate from authoring Save. No cache becomes authoring authority.

Changes, impact, Analysis, comparison and coverage extend their existing owners.
Saved semantic concepts each enter the denominator once, with only required
emitted context rows. Working additions/removals are disclosed separately.
Hidden primitives add no published primitive count; their emitted semantics do.
Generated literals are not manual edits. Broad canonical materialization and
missing/stale reference evidence remain unassessable.

## Acceptance and verification

| ID | Required outcome |
| --- | --- |
| V-01 | Medium only initially; complete mappings; Structure-owned enabled sizes. |
| V-02 | Irregular traversal differs intentionally; no name/menu/value sorting. |
| V-03 | Boundary/interior nearest warnings and directional ties; sizes never merge. |
| V-04 | Aliases identify real emitted targets in the correct context. |
| V-05 | Exact hidden dimensions, overrides and complete shadows; no hidden target rows. |
| V-06 | Source/rule/visibility changes regenerate while preserving topology identities. |
| V-07 | Correct complete/partial padding and corner groups using all five mappings. |
| V-08 | All versus Custom, initial/dynamic overlaps and stale-target repair. |
| V-09 | Required contexts only; explicit equal assignments retained; preview exclusion. |
| V-10 | Independent migration, Apply/Cancel, Save/reload/Cancel, Reset, Delete/Undo and cache repair. |
| V-11 | Shared authored/generated Changes, saved denominators and Analysis agree. |
| V-12 | Pinned schemas/bytes, declared extensions, exact values and honest limits. |
| V-13 | Keyboard/pointer, light/dark, desktop/narrow; no page errors or ComboBox regression. |
| V-14 | Rounding, primitive identity, foundation/mode output and older profiles preserved. |
| V-15 | Invalid inputs fail explicitly, with no partial/last-good/default substitutes. |
| V-16 | Governed names, stable renames, collision/ownership errors and physical meaning. |
| V-17 | Reference existence/type/context/cycles and dependency/Undo continuity. |
| V-18 | Nearest warnings visible across rule/dialog/Permutations/Tokens/export. |
| V-19 | Three approved isolated Storybook sets, focused states and deterministic interactions. |
| V-20 | Source overrides honored; generated rows protected; product defaults/direct overrides deferred. |

Focused suites include `test:tshirt-sizing`, `test:tshirt-integration`, existing
Logic/Structures/persistence/primitive/Registry/token/Changes/impact checks,
dimension/shadow artifacts and materialization/coverage. Run lint, production
and Storybook builds. Browser checks start only after both parts and integration
exist; each application/Storybook path collects and asserts no `pageerror`.
Do not run a Storybook build concurrently with checks consuming its output.

## Evidence and continuing approval boundaries

LTAX-009 in the canonical register owns this app-to-reference slice and its
pin, check evidence, blockers and remaining limitations. Related LTAX-002/003/
005/007/008 and JTC-007 retain separate scopes; no existing closure is broadened.
Implementation, alignment disposition and RFC state remain distinct.
Regenerate derived gap documentation and run `test:design-data-gaps` for changes.

Feature evidence lives in `src/data/design-data-tshirt-profile/provenance.json`,
the focused source/tests above, the
[storage contract](../design-data-authoring-storage-contract.md#t-shirt-generation-and-structure-variants)
and [target contract](../design-data-target-contract.md#pinned-t-shirt-generation-subset).
The feature pin supplies token/field schemas and catalogs from
`adobe/spectrum-design-data`; no runtime moving-main dependency or reference
checkout mutation is introduced.

After verification, suggest bounded progress for EPIC-5.1/5.3 and
EPIC-4.2/4.3/4.4. Do not mark their larger initiatives complete or change
`docs/ROADMAP.md` without approval.
