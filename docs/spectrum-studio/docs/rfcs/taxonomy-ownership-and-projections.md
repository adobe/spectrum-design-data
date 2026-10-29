# RFC draft: strict category ownership and shared ordered projections

> **Audience:** a proposal intended for the design-data repository. Not yet submitted upstream. Tracked as LTAX-001 to LTAX-004 in the gap register.

Status: local draft only. Not submitted, accepted or implemented upstream.
Canonical tracking: `LTAX-001`, `LTAX-002`, `LTAX-003` and `LTAX-004` in
`src/data/design-data-gaps.json`; existing findings `JTC-002`, `JTC-008`,
`JTC-010` and `JTC-011` retain their identities.

## Authorities and intentional differences

Reference: spectrum-design-data revision
`838a6835b746f9d77b2697374408901f334d854e`, inspected read-only.
Spectrum studio historical output baseline:
`c84de71cec30d63bac6ee2034a7989cf47e751fc`.
The approved working implementation and full migration crosswalk are in
[the taxonomy/order plan](../archive/token-taxonomy-order-plan.md).
Draft [adobe/spectrum-design-data#1454](https://github.com/adobe/spectrum-design-data/pull/1454)
was inspected separately at `fa714564eaa33bc37f905fad64162d60d6a48087`;
it is prospective evidence, not the checkout pin or an accepted app contract.

The current taxonomy specification describes hierarchical naming layers.
Name objects are unordered flat data; serialization order must not affect
cascade or specificity. The field catalog already supplies
`serialization.position`, scope and vocabulary declarations. Formatting
configuration already exists in the specification.

Current upstream permits word reuse across independent categories.
Spectrum studio requires one global owner for each normalized textual value and
text/numeric-string collision. Only numeric Scale index and Number may reuse a
value, with distinct category-owned term UUIDs. This is an intentional policy
difference, not proof that upstream lacks vocabulary or serialization ordering.

## Proposed local contract

Categories have immutable version-four UUIDs, unique machine field keys, value type, cardinality,
scope and required status. One category flag, "Include in names and hierarchy",
controls both projections. Exclusion never removes flat classification.
The author-editable global order contains each category once, with no per-token/type
overrides. Group order determines names and table paths, not vocabulary rank,
sibling-token sorting, conceptual parentage or cascade precedence. New groups
are optional and broadly scoped. Property is included by default, required only
by families that need it, not generic Spacing or complete Elevation shadows.

Terms have immutable UUIDs and category ownership. Normalize with surrounding
whitespace removal and case-insensitive whole-value comparison.
`focus`, `Focus` and ` focus ` collide. `focus-ring` does not.
Numeric `100` and textual `"100"` collide, while retaining their original types.
Scale index accepts finite negative, fractional, intermediate and large
coordinates. Number accepts positive safe integers starting at one; sample
values do not define a closed enum. The numeric exception never permits
same-category duplicates or cross-category word reuse.
Many sources and tokens may reference one term. No suffixing or word-ownership
escape hatch is proposed. Compatibility alias tokens are a separate Save-time
reference layer, not aliases for registered terms.

Classification is a flat category-UUID to one term-UUID assignment, including
Interaction and Interactive context. Imported legacy arrays remain available
for diagnostics but block unsupported upgrades/exports; they are never silently
truncated. The inspected draft's multi-value interaction policy is a separate
intentional difference.
Mode declarations retain their current authority; this contract does not
introduce a duplicate mode vocabulary or change cascade behavior.

## One projection

Resolve references, then select populated included categories in global order.
Return typed ordered segments. String output joins those segment values with
the current kebab delimiter. Tree branches use category/term IDs and ancestry;
leaves retain token identity. Hyphenated terms remain atomic.

For example:

```json
{
  "classification": {
    "<Property UUID>": "<Color term UUID>",
    "<Color name UUID>": "<Red term UUID>",
    "<Scale index UUID>": "<100 term UUID>"
  },
  "flatName": { "property": "color", "colorName": "red", "scaleIndex": 100 },
  "name": "red-color-100",
  "path": ["Red", "color", 100]
}
```

Reversing the included category order changes the name to `100-color-red` and the
path to `100 -> color -> Red`, without changing identity, values or modes.
Future Save may capture the replaced name as a compatibility alias.
Global vocabulary uniqueness does not guarantee serialized-name uniqueness:
`a-b` plus `c` and `a` plus `b-c` serialize identically. Detect collisions and
block taxonomy export; retain every token leaf, including shared paths.

## Canonical defaults and foundation governance

Checked-in JSON supplies shipped/reset defaults. Durable working/saved authoring
is the user authority after editing. Foundation names store category/term
references and optional explicit output classifications; runtime source labels
are derived, not a second name authority. Source labels need not be included in
output: the shared Global term labels three foundations, while their explicit
names are `spacing-100`, `size-100` and `radius-100`.
Normal name fields explicitly select compatible existing terms or
register new ones under the same global uniqueness constraints. Shared renames
keep IDs and show reference impact. Referenced deletion/retyping requires
explicit remapping. Deleting a source does not delete its registered vocabulary.

Foundation models own explicit output properties, typography roles and numeric steps.
There are no foundation classification dialogs, separate source-assignment
editors or custom step mappings. Color indices follow the shared ordered contrast sequence:
position zero is 100, position one is 200, and so on. Contrast ratios remain
independent values; they are not interpreted as indices. Dimension steps retain
their existing generator identities. Typography retains its native metric IDs.
Surface tint links use stable color-scale IDs rather than parsed names.
The reviewed migration maps Text/Size to `text-size-100`, Body/Line height to
`body-line-height-100`, Workflow-icon/Size to `workflow-icon-size-100`, and
Surface/Shadow to `surface-shadow-100`. Ordinary name changes never parse
hyphenated labels into classifications. Selecting a different source term
updates that term's assignment without retaining a stale output reference.

Fresh/reset catalogs retire the eight obsolete compound Typography metric terms
and the `typography` Property placeholder; internal metric keys remain unchanged.
The approved source-name groups retain their order, with Typography metric empty
by default. Elevation references the existing Surface Element directly, with
Shadow owned by Attribute, rather than retaining an invented Elevation scale term.
Native Structure slots keep their required vocabulary. Cleanup of shipped seeds
does not purge valid custom/legacy vocabulary from durable saved/working records.

Registry owns the catalog, references, global category order and inclusion.
One typed ordered projection supplies lowercase kebab-case names and tree
paths. Original term values and tree labels remain unchanged. Formatting is
a shared boundary, not a new platform-setting interface. Generated tokens
cannot override governed classification. Freeform unresolved tokens remain
visible and require explicit review before taxonomy export.

Canonical name ownership remains global across declared contexts. Two tokens
cannot own one serialized full name even if their values match or their modes
differ. Custom category exclusion/reordering may introduce a collision: block
the operation/export, retain every leaf, and require explicit repair.

Authoring envelope v6 persists working data and the last-saved baseline together,
including aliases and native token edits. Save advances both only after a
successful coherent write; Cancel restores the saved graph. Reload restores both;
confirmed Reset all restores shipped defaults and no aliases. Recognized v1-v5
records upgrade working/saved independently, after existing domain upgrades,
without creating historical aliases. Invalid/conflicting data is preserved with
explicit diagnostics, not silently reset or remapped. No pre-UUID prototype
recovery is added. Preferences and temporary previews stay separate.
Artifact fingerprints and Analysis use canonical references;
Analysis row identities remain stable across registered name changes.
Development hot reload replaces retained artifact repositories when their
implementation module changes, so an old compiled schema cannot reject the new
source contract. Obsolete jobs are cancelled without resetting authoring data
or unsaved form drafts; strict schema validation remains enabled.

The native authoring schema owns the catalog. Local taxonomy packets use
`leonardo-flat-taxonomy-v1`; dimension output uses
`leonardo-proposed-dimensions-v3` with Registry-projected typed names rather than
mandatory Property/Foundation scale fields. Local projection evidence belongs in lineage
metadata, not unsupported fields silently inserted into upstream records.
Foundation surface references use stable surface IDs in local projection
metadata; they do not invent extra upstream token rows. The existing color CSS
library preserves its dynamic utility/control relationships and exposes
Registry-ordered palette, scale and surface variables. Typography uses the same
strict registered-name formatter. Pinned T-shirt/shadow bundles retain their
explicit draft serializers; they do not override canonical app display names.

## Compatibility references

Future Save compares the previous saved canonical outputs by stable source
identity and owning contexts. A changed existing name creates one captured
full-name alias per owner, directly referencing that canonical source. Alias
identity is deterministic from owner and captured name; export rows add context.
Dimension/Elevation identities use mathematical indices, not display steps.
Typography uses metric identity and mathematical position.

Initial migration/default load, previews, intermediate edits and new tokens do
not create aliases. Deletion is available only in Edit mode and supports
Save/Cancel/reload/revert. Unchanged Save never recreates a deleted alias.
Canonical own-name reuse removes redundant alias contexts; cross-owner canonical
or alias collisions block Save. Source/step/publication removal prunes contexts
without weakening Structure reference guards.

Aliases have no editable values, independent classification or chained targets.
Tokens resolves their current/preview values from the canonical target.
The local packet emits reference-only aliases to exact emitted row UUIDs.
Semantic references also point to emitted primitives; hidden-source outputs
remain literals. Compatibility records are separate Analysis/change-log entries,
excluded from canonical concept and mode-value denominators.

## Separate issues

- `LTAX-003`: the integer catalog, string-only unknown token-name fields and SDK
  `as_i64` branches disagree. The app keeps finite typed numeric coordinates
  and formats negatives/fractions/exponents explicitly. The local v3 schema
  is not a correction to, or proof of conformance with, upstream.
- `LTAX-004`: manifest formatting support in specification versus application
  by the reference SDK. Specification prose is not executed SDK evidence.

## Acceptance and affected tooling

Acceptance needs schema/composition and direct-state validation; identity
preservation; Registry authoring; foundation registration; shared names/tree;
serialized collision diagnostics; Save/Cancel/reload/revert; artifact sequencing;
and scoped saved evidence regression/staleness tests.

Consumers include authoring defaults, durable working/saved state, foundations, Tokens
list/grid/editing, exports, dimension artifacts, changelog/impact, and Analysis/CLI.
Architecture acceptance and an upstream RFC decision require recorded review
evidence. Local implementation or equal token values cannot supply that review.

The three historical full-output pins were reproduced from commit `c84de71`,
then compared with current output using an explicit naming-only invariant
adapter. All 3,486 prior token rows retain IDs, values, units, contexts, formulas
and mode wiring. Historical byte hashes are retained rather than overwritten
with new names. This proves local migration preservation, not upstream alignment.

Focused contract evidence includes `test:taxonomy-order`, `test:token-aliases`,
`test:defaults`, `test:design-data-materialization`, `test:design-data`,
`test:persistence`, `test:changelog` and `test:impact`. Five Registry-editing
browser paths and five Registry/Tokens/alias/order/color paths passed on port
5173, including desktop/390 px layouts and empty page-error lists. The
[plan's verification record](../archive/token-taxonomy-order-plan.md#completed-local-verification)
separates these results from upstream conformance. Architecture acceptance,
mapped reference coverage and an upstream decision still require recorded review.

No upstream files, default values, draft catalogs, platform manifests or Git
publishing are changed by this packet. A future whole-name Platform formatter
and broader semantic engine are not part of this slice.
