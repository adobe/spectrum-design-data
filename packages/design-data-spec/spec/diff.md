# Semantic diff

**Spec version:** `1.0.0-draft` (see [Overview](index.md))

This document defines the **semantic diff model**: how two versions of a design data dataset are compared to produce a structured change report with awareness of renames, deprecations, and property-level changes.

## Token identity

A **token identity** determines whether a token in the old dataset and a token in the new dataset refer to the same logical token.

**NORMATIVE:** Implementations **MUST** use the following matching rules, in order:

1. **UUID match** — If a token in the old dataset and a token in the new dataset share the same `uuid` value, they are the **same token** regardless of name.
2. **Name-object equivalence** — When a UUID match is not found for a token — because the old token, the new token, or both lack a `uuid`, or because no counterpart with the matching `uuid` exists in the other dataset — two tokens are the same if their `name` objects are deeply equal (all fields present with identical values).
3. **Replacement link** — When passes 1 and 2 leave an old token unpaired and it carries a `replaced_by` field whose UUID matches an unpaired new token, the pair is established. This enables diff classification as **renamed** for tokens that were deprecated with a machine-readable replacement pointer.

**NORMATIVE:** UUID matching **MUST** take precedence over name-object equivalence, which **MUST** take precedence over replacement link matching. A UUID match always identifies the token pair, even if name objects differ (which constitutes a rename).

**RATIONALE:** UUID-based identity allows tokens to be renamed without breaking continuity tracking. Name-object equivalence is a fallback for legacy datasets that predate UUID adoption. Replacement link matching is a tertiary fallback for deprecated tokens that carry an explicit `replaced_by` UUID pointing to their successor.

## Change taxonomy

A semantic diff classifies every token into exactly one of six categories:

| Category       | Definition                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------ |
| **renamed**    | Token exists in both datasets (matched by identity) but the name has changed.                    |
| **deprecated** | Token exists only in the new dataset (unmatched) and carries a `deprecated` field.               |
| **reverted**   | Token existed with `deprecated` in the old dataset and no longer carries it in the new dataset.  |
| **added**      | Token exists only in the new dataset and is not renamed, deprecated, or pre-existing.            |
| **deleted**    | Token exists only in the old dataset and is not the source of a rename.                          |
| **updated**    | Token exists in both datasets (matched by identity) with the same name but changed properties.   |

**NORMATIVE:** Every token that appears in the old dataset, the new dataset, or both **MUST** be classified into exactly one category. Categories are mutually exclusive.

## Category partitioning

**NORMATIVE:** Implementations **MUST** resolve categories in the following order to ensure mutual exclusivity:

1. **Renamed** — Identify all identity-matched pairs where the name has changed. These tokens are removed from further classification as added or deleted.
2. **Deprecated** — Among remaining unmatched new tokens, identify those carrying a `deprecated` field. These are removed from the "added" pool.
3. **Reverted** — Among identity-matched pairs, identify tokens where `deprecated` was present in the old version and absent in the new. These are removed from the "updated" pool.
4. **Added** — Remaining unmatched new tokens that are not renamed, deprecated, or pre-existing in the old dataset.
5. **Deleted** — Remaining unmatched old tokens that are not the source of a rename.
6. **Updated** — Remaining identity-matched pairs with unchanged names but differing properties.

**RATIONALE:** This ordering mirrors the pipeline in existing tooling and ensures that a renamed token does not also appear as "added" + "deleted", a deprecated token does not appear as "added", and so forth. A matched token that newly gains a `deprecated` field is classified as **updated** — the deprecation surfaces as a property-level change in the updated sub-categories, not as a new-token deprecation.

## Deprecation normalization

**NORMATIVE:** When a token uses the legacy `sets` structure and **all** set entries carry `deprecated: true`, the token **MUST** be treated as deprecated at the token level for diff classification purposes, even if the top-level token object does not carry `deprecated`.

**RATIONALE:** Set-level deprecation that covers all variants is semantically equivalent to token-level deprecation. Normalizing this prevents diff noise from implementation-level differences in where the `deprecated` flag is placed.

## Property-level changes

For tokens classified as **updated** (or **renamed** with additional property changes), a semantic diff **SHOULD** produce property-level change records.

### Change record format

Each property-level change is described by:

| Field            | Type   | Description                                             |
| ---------------- | ------ | ------------------------------------------------------- |
| `path`           | string | Dot-separated path from the token root (e.g. `value`, `name.colorScheme`, `sets.light.value`). |
| `new_value`      | any    | The value in the new dataset. Present for additions and updates. |
| `original_value` | any    | The value in the old dataset. Present for deletions and updates. |

### Property change sub-categories

| Sub-category          | Condition                                         |
| --------------------- | ------------------------------------------------- |
| **added-properties**  | Property exists in new but not in old.             |
| **deleted-properties**| Property exists in old but not in new.             |
| **updated-properties**| Property exists in both but with different values. |

**NORMATIVE:** Property comparison **MUST** be recursive: nested objects are traversed and changes reported at the leaf level with full dot-separated paths.

**NORMATIVE:** Property comparison **MUST** use deep equality for values. Two values are equal if their JSON serializations are identical.

## Output ordering

**RECOMMENDED:** Diff output **SHOULD** be deterministic. Within each category, tokens **SHOULD** be sorted by their canonical name (or new name for renames) in lexicographic order.

**RATIONALE:** Deterministic output makes diff reports suitable for snapshot testing and human review.

## Cross-format compatibility

**NORMATIVE:** A conforming diff engine **MUST** accept both legacy format (JSON object maps) and cascade format (JSON arrays with `.tokens.json` extension) as inputs for either the old or new dataset, including mixed-format comparisons (e.g. legacy old, cascade new).

**RATIONALE:** The diff operates on the token graph abstraction, which normalizes both formats into the same `TokenRecord` structure. This enables diffing across format migrations without special-case handling.

## References

* [#623 — Token Lifecycle Metadata](https://github.com/adobe/spectrum-design-data/discussions/623)
* [#714 — Design Data Specification](https://github.com/adobe/spectrum-design-data/discussions/714)
* [#776 — Phase 3: Diff change taxonomy and token identity rules](https://github.com/adobe/spectrum-design-data/issues/776)
