# PR 1454: taxonomy and vocabulary split review

## Scope, status, and provenance

Read-only review for the joint target-contract work on 2026-10-05. The user
explicitly requested inclusion of the future-forward taxonomy work in
[PR #1454](https://github.com/adobe/spectrum-design-data/pull/1454), branch
`feat/token-taxonomy-vocabulary-split`, and its
[RFC #1453](https://github.com/adobe/spectrum-design-data/discussions/1453).

| Authority | Observed identity |
| --- | --- |
| PR | Open draft; GitHub reports merge conflicts (`mergeable: false`, state `dirty`) |
| Inspected head | `fa714564eaa33bc37f905fad64162d60d6a48087` |
| Earlier PR commit | `c314bbf0d91b4b06ac88ce8a6f4258312dcd68ab` |
| GitHub PR base at review | `main`, `576d76b0a1b0f120176290b25036c09a7f985025` |
| Merge base used for delta checks | `282fc49fb452534367f58632eca6f5e75c234f9c` |
| Unchanged local reference checkout | `838a6835b746f9d77b2697374408901f334d854e` |
| Difference inventory | 137 files; 2,765 additions / 2,592 deletions |

The existing local remote-tracking ref matched the GitHub head SHA. Files were
read with `git show` and compared by immutable commit IDs. No checkout, fetch,
branch switch, installation, regeneration, upstream build, or reference mutation
was performed. GitHub PR metadata, CI results, and author statements are evidence
of their respective sources, not local test results. No GitHub review/comment was
published.

The local checkout, live PR base, merge base, and PR head are **different
snapshots**. Do not combine their catalogs, counts, SDK binaries, or schema results
into one dataset. The draft still uses `1.0.0-draft` schema identifiers; commit/content
provenance is necessary to distinguish breaking draft revisions.

## Direction to include in the joint proposal

The PR's boundary test is a strong target-design input: if a term has the same
meaning on unrelated components, it can belong to universal taxonomy; vocabulary
that depends on one component's construction belongs to that component's data.
Token fields can reference component data without owning that vocabulary globally.
This is a design hypothesis supported by the RFC and implementation, not a claim
that every boundary choice is finalized or merged.

| Change | Implication for Spectrum studio's target contract |
| --- | --- |
| Remove `substructure` and generic `role` | Do not build editors around their presence in the current checkout. Preserve migrations and distinguish the removed generic field from domain-specific `colorRole`. |
| Split former `object` meanings | Generic surfaces become `element`; property sub-qualities become `attribute`; behavior indicators become `affordance`. A global `object -> element` string rename is not a lossless migration. |
| Add `visibility` | Prominence is a separate classification dimension from variant identity; value equality and an old informal registry tag do not settle the distinction. |
| Split `state` | `interaction` and `interaction-context` are ordered semantic arrays, not adaptive mode axes. Both refer to the same component `states[]` catalog; the split must not duplicate component state identity. |
| Atomic property vocabulary | Property/classification decomposition must be audited separately from serialized legacy names. Do not infer every decomposition from hyphen splitting. |
| Component vocabulary remains scoped | Component anatomy/options/states can be local; shared words across registries/components need scoped identities and explicit relationships, not one global uniqueness constraint. |
| Split terminology extensions | Existing foundation term IDs can have platform terminology mappings, without treating native platform names as new universal IDs or adaptive modes. |
| Catalog-driven array processing | Naming and advisory registry validation read `valueType: array`; array order and each term must survive round-trip. Catalog support, schema support, query support, and consumer behavior are separate capabilities. |

Representative inspected changes: field and registry catalogs; token/relationship
schemas; taxonomy/registry/state/query docs and rule assertions; component state
declarations; migrated token data; SDK naming, query/cache, registry, and component/
relationship reference rules. Generated `registry_data.rs` is counted as generated
output, not independently authored taxonomy. The complete 137-path delta was
inventoried; this is not an exhaustive line-by-line review of every Rust function.

## Independently observed data changes

Parsed all eight token JSON arrays at the merge base and head, paired by UUID,
and compared recursively key-sorted JSON (array order retained):

- Head corpus: 2,374 token rows, versus the separately audited local checkout's
  2,533 rows. These are snapshot counts, not a PR removal claim.
- 551 rows change structured content; zero token UUID additions/removals,
  zero literal-value changes, and zero `$ref` target changes in this delta.
- Field catalog: 33 declarations at merge base, 35 at head (six added, four removed).
- Relationship corpus: 91 files / 6,415 rows; 92 retain `scope.options.state`
  arrays, and none use the two new interaction option fields.
- 413 token rows have an interaction field without a component anchor. This is
  a corpus observation requiring ownership/spec clarification, not an automatic
  claim that every such token is invalid.

The author describes approximately 450 migrated tokens; the 551 count above is
the inspected latest-head structured-row delta, not a claim about the earlier
commit's migration count. Published legacy output compatibility is separately
reported by the author/CI; zero value changes alone does not prove byte-identical
legacy serialization.

## Findings and target follow-ups

### PR1454-001: relationship state migration does not match the new scope schema

**Priority:** high. **Confidence:** confirmed data and targeted schema check.

The head `relationship.schema.json` explicitly permits the two new array fields
and permits only strings for other option keys. The unchanged relationship corpus
contains 92 legacy `scope.options.state` arrays. Examples:

- `relationships/avatar.json/47/scope/options/state` (disabled).
- `relationships/card-horizontal.json/1/scope/options/state` (default).
- `relationships/card.json/0/scope/options/state` (loading).

Using existing app-installed Ajv 2020, `strict: false`, `validateFormats: false`,
and `allErrors: true`, the exact branch `$defs.scope` fragment rejects those 92
fields as `must be string`. At the merge base the same check has zero such state
errors. All scope errors total 81 at merge base versus 173 at head; the 81 other
errors are pre-existing relative to this delta and not attributed to the PR.

The initial whole-schema compilation attempt stopped on an unregistered relative
value-type schema reference. The successful scope-fragment check is **not** a
complete relationship-schema, dataset, or SDK validation run.

`spec054.rs` now reads only the two new arrays; `spec053.rs` skips non-string
generic option values. Thus token migration alone does not establish CTR migration
or equivalent relational checks. The author/CI's reported zero-error dataset run
must be evaluated against its actual catalog/validation scope, not dismissed or
assumed to cover this targeted check.

**Recommendation / discriminating check:** classify current and draft relationship
validity separately; review migration of each legacy state using component trigger
and meaning, preserving UUID/references. Run the full configured relationship
schema and relational checks on the draft corpus before claiming complete coverage.
No upstream repair is authorized here. Relates to JTC-009/010.

### PR1454-002: field membership does not establish trigger-bucket correctness

**Priority:** medium. **Confidence:** confirmed source; acknowledged RFC follow-up.

`spec022.rs` and `spec054.rs` collect both interaction arrays and check membership
against one component `states[]` list. They do not check whether a state is placed
in the field matching its declared `trigger`. RFC #1453 explicitly identifies
this as a prospective new rule, not an implemented one. The inspected corpus has
no mismatches among token rows with a resolvable component and explicit trigger;
that absence is not proof the rule exists.

**Recommendation / discriminating check:** the target proposal should include
transient/persistent placement as an explicit requirement and respect legitimate
component-local semantics. Deliberately place an existing prop-triggered state in
`interaction`, and verify a future token/CTR checker reports it. Do not invent a
SPEC ID or label this as accepted current validation.

### PR1454-003: prose, catalogs, and data retain mixed transitional semantics

**Priority:** medium. **Confidence:** confirmed source/data; desired policy unresolved.

- `spec/taxonomy.md:197-199` still calls emphasized/subtle/subdued unclassified
  pending a future modifier field, while the same head introduces `visibility`
  and reclassifies affected tokens.
- `spec/token-format.md:250-254` still lists background-color/font-size as valid
  examples despite their removal from the property registry. Advisory acceptance
  is distinct from recommending the new taxonomy spelling.
- `spec/state-model.md` requires interaction fields to be component-anchored,
  while taxonomy describes universal interaction fields and the corpus contains
  413 unanchored interaction rows. Clarify canonical universal use versus
  component cross-reference requirements rather than retrofitting registry flags.

**Recommendation / discriminating check:** R1 should expose prose/catalog/data
disagreements under a pinned profile. Review representative global and component
tokens against the intended ownership rule; do not flatten all disagreements into
missing app support or mechanically rewrite unanchored rows.

### PR1454-004: declared and serializable fields are not all queryable

**Priority:** medium for the audit tool. **Confidence:** confirmed source; capability
limit, not a violation of the documented supported-key list.

Head `sdk/core/src/query.rs:24-57` exposes a fixed allowed/indexed key list:
property, component, variant, interaction, interaction-context, colorScheme,
scale, contrast, uuid, and $schema. It does not include element, attribute,
affordance, or visibility. The query EBNF's key production also omits hyphens,
although the proposed `interaction-context` key and parser support need them.

**Recommendation / discriminating check:** record field capabilities independently
(declared, schema-valid, vocabulary-checked, serializable, queryable, authorable).
Do not assume a new field can be used in manifest queries or SDK facets. Check a
representative attribute query and the new hyphenated key against the selected SDK;
any expanded query implementation is a separate upstream proposal, not this review.

### PR1454-005: compatibility depends on profile and consumer, not output equality

**Priority:** high integration risk. **Confidence:** confirmed delta/PR metadata.

The PR changes catalog keys, array shape, query keys, cache indexes/schema version,
and SDK consumers while reporting unchanged published token output. Legacy
serialization compatibility does not establish name-object/API compatibility.
New array fields require explicit schema properties; removed scalar keys can still
pass the token schema's generic string allowance, so shape validity alone cannot
prove their taxonomy is current. Changeset/version sequencing remains a reported
follow-up; the PR is still draft and conflicts with its live base.

**Recommendation / discriminating check:** pin checkout/branch schemas, data, and
SDK evidence as separate profiles with hashes/revisions and migration status.
Never run the old installed SDK against draft data and call that draft conformance.
Compare UUID/reference preservation, structured meaning, serialization, and API
behavior separately. Migration must preserve the distinction between renamed,
split, reclassified, and removed concepts.

## CI evidence and limits

GitHub's observed checks include successful Node/Rust and diff jobs; the run report
lists registry/dataset validation, legacy output, round-trip, build, SDK tests,
lint, and formatting checks. The author reports 1,432 workspace tests, zero errors /
986 warnings, byte-identical legacy output, and a known unrelated pinned snapshot
mismatch. No local upstream tests/builds were run and these claims were not
independently re-executed. They do not supersede the independently observed scope
fragment mismatch above or establish conformance of the locally installed binary.

## Incorporation into the Spectrum studio proposal

Include the universal-versus-owner-scoped vocabulary boundary, semantic property
decomposition, prominence/variant distinction, ordered interaction buckets with
shared component-state references, catalog-aware array handling, and explicit
platform terminology mappings as target-design inputs. Carry PR1454-001 through
PR1454-005 into the architectural evidence registry and acceptance examples.

Do **not** copy the branch catalogs into shipped defaults, globally rename fields,
replace the current CLI reference snapshot, or declare the draft merged. The PR
does not introduce portable recipe/formula/rule schemas, retire desktop/mobile
density, or resolve the separately inspected platform override-lineage issue.
Those target requirements remain independent. The current runtime reports and
their 352 color pairs / 12 SDK errors remain reports of their existing snapshot.

This review recommends adopting the PR's architectural distinctions for proposal
work, not silently making Spectrum studio 1:1 with this draft corpus. See the
[joint target contract](design-data-target-contract.md) and revised execution plan
for the next approval boundary.
