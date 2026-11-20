<!-- Copyright 2026 Adobe. All rights reserved. -->

# RFC draft: token tiers and category scope

Status: local draft, not submitted or accepted upstream. Studio uses the
proposed model internally; the published design-data schema and canonical
token corpus are unchanged. Alignment tracking: LTAX-021 in
`src/data/design-data-gaps.json`. LTAX-020 tracks the earlier Add token flow.

**Update:** design-data now derives an official tier for each token (#1932),
reported by the SDK (`design-data query --filter tier=…`). Studio's practice
copy uses that derived tier, not this RFC's model, to place token files (see
[design-data-token-file-layout.md](design-data-token-file-layout.md)). This
RFC's conceptual tiers and tier-scoped categories remain a separate proposal;
reconcile the two before submitting it.

## Problem

Tools need to distinguish a token's conceptual responsibility without guessing
from its name, generator, value, or references. Registry categories also need
to say which kinds of tokens may use their terms.

Studio previously asked whether a new token was a raw value or purpose-based.
That answer filtered creation questions but was not stored as a token tier.
The category setting did not govern other classification consumers.

## Proposed data

Add one optional field, `tier`, to both literal and reference token records:

```json
{
  "tier": {
    "type": "string",
    "enum": ["primitive", "semantic", "component"]
  }
}
```

This is a property-schema fragment, not a complete token schema. `tier` sits
beside `name` and `value` or `$ref`, not inside the name object.

| Tier      | Responsibility                               | Current Studio source                                          |
| --------- | -------------------------------------------- | -------------------------------------------------------------- |
| Primitive | A foundation-level value                     | All Foundations, including opacity and data-vis                |
| Semantic  | A shared purpose or reusable structural role | All current Structure-generated tokens                         |
| Component | A token defined for a specific component     | Explicit choice in manual creation; no new component generator |

Using a Primitive or Semantic token in a component does not reclassify it.
Foundation outputs remain Primitive even when their names include roles or
their formulas reference other values. Structure outputs remain Semantic even
when a derived value is emitted literally.

### Tier and references are independent

Each tier can carry a literal value or reference another token:

```json
[
  { "name": "example-primitive", "tier": "primitive", "value": 8 },
  { "name": "example-primitive-ref", "tier": "primitive", "$ref": "<uuid>" },
  { "name": "example-semantic", "tier": "semantic", "value": 12 },
  { "name": "example-semantic-ref", "tier": "semantic", "$ref": "<uuid>" },
  { "name": "example-component", "tier": "component", "value": 16 },
  { "name": "example-component-ref", "tier": "component", "$ref": "<uuid>" }
]
```

These illustrative records omit other validation concerns; `<uuid>` stands
for an actual target UUID. Tier adds no reference-order rule, dependency
hierarchy, or restriction on cross-tier references.

Changing a token from a literal to a reference, overriding its value, or
selecting another mode does not change its tier. A compatibility alias uses
its canonical target's tier in Studio's derived browser view; it does not
become a new canonical token concept.

### Category eligibility

Add an optional `allowedTokenTiers` field to Registry category definitions and
the corresponding upstream field declarations:

```json
{
  "allowedTokenTiers": {
    "type": "array",
    "items": { "enum": ["primitive", "semantic", "component"] },
    "minItems": 1,
    "uniqueItems": true
  }
}
```

| Category            | Allowed tiers       |
| ------------------- | ------------------- |
| Color family        | Primitive, Semantic |
| Scale index         | Primitive, Semantic |
| Interactive context | Semantic, Component |
| Interaction         | Semantic, Component |

Scale index allows Semantic so that color-role scales, such as
`accent-color-100`, can keep the step number that design-data already
publishes on semantic palette tokens. Color family allows Semantic for
per-family semantic colors, such as the Icon style's outputs and
design-data's icon and color-alias tokens.

Omission means all tiers. An empty list, duplicate tier, or unknown tier is
invalid metadata. Existing type/domain scope still applies: eligibility is
the intersection of that scope and the allowed tiers. Required classification
applies only to eligible tokens. A source's descriptive name is not itself a
token and does not acquire a tier restriction.

Tier is not a value type, taxonomy term, name segment, mode, or cascade layer.
It does not change UUIDs, serialization order, specificity, or resolved values.

## Compatibility and authoring

The proposed upstream token field is optional. A missing tier means
unclassified, not Primitive. Existing external data must not be assigned a
tier based on `$ref`, a literal value, or words in its name.

Studio assigns generated tiers at their producer. Manual creation explicitly
selects a tier and persists it in manual authoring. Its existing token
inspector can change that tier and review incompatible terms.

Studio replaces the creation-only category setting with `allowedTokenTiers`:
`raw` becomes Primitive, `purpose` becomes Semantic + Component, and `both`
or omission becomes unrestricted. The saved-data upgrade applies to working
and saved baselines independently and does not mutate its input. Old manual
tokens with an explicit `structures` scope upgrade to Semantic; cases without
clear stored evidence remain unclassified with a review diagnostic.

The shipped defaults follow the Registry's tier table, so Element is
Semantic-only and Attribute is Semantic + Component. Existing Typography and
Elevation foundations still use Element terms such as Text, Body, and Surface,
and the Attribute term Shadow. Those Primitive outputs keep their names and
show a tier diagnostic until they are reclassified (tracked in DEBT-044).
Saved user restrictions are preserved rather than silently broadened.

New incompatible assignments are rejected by authoring validation. Existing
incompatible assignments remain present with diagnostics, and their terms
remain visible for repair. Tier diagnostics do not make a previously usable
primitive value unavailable to a Structure or an alias. Strict alias and
export validation block on other projection issues, but not on tier
diagnostics alone (`blockingProjectionIssues`), so the app keeps loading,
editing, and exporting while classification repair is pending.

## Evidence and enabled behavior

| Consumer                          | Use of tiers                                                                                                                  | Evidence                                                                                                   |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Foundation and Structure adapters | Identify generated tiers without inspecting reference shape                                                                   | `tests/token-tiers.ts`; `browserSources.ts`, `semanticSource.ts`, opacity, elevation and data-vis adapters |
| Add token                         | Offer three explicit tiers and ask only eligible category questions                                                           | `tests/token-creation-flow.ts`, `tests/token-tiers.ts`                                                     |
| Registry and token inspector      | Edit category restrictions; retain existing terms; reject new incompatible selections                                         | `TaxonomyEditor.tsx`, `ClassificationTerms.tsx`, `dialogModel.ts`, `referenceValidation.ts`                |
| Shared projection                 | Apply tier scope consistently without renaming tokens or bypassing name collisions; include tier in batch-cache keys          | `tests/token-tiers.ts`, `taxonomy/model.ts`, `tokens/browserModel.ts`                                      |
| Authoring lifecycle               | Persist and compare manual tiers and category restrictions without changing token values or identity                          | `tokenTierUpgrade.ts`, `tests/token-tiers.ts`                                                              |
| Structure references              | Keep existing primitive values usable while reporting incompatible category tiers; continue blocking unrelated errors         | `tests/token-tiers.ts`, `primitiveReferences.ts`, `dimensionArtifacts.ts`, `structureVariantLeaves.ts`     |
| Local taxonomy packets            | Carry tier metadata independently from literal/reference output                                                               | `tests/token-tiers.ts`, `taxonomy/export.ts`                                                               |
| Component token catalog           | Preserve a referenced token's tier without reclassifying it as Component                                                      | `components/references.ts`                                                                                 |
| Changes and Impact                | Count a manual tier edit as authored metadata without changing generated values, token identities, or component-impact totals | `tests/token-tiers.ts`, `changelog/computeComparison.ts`                                                   |

Without explicit tiers, these consumers need separate producer-specific
guesses. They cannot reliably distinguish a literal-valued Semantic token
from a Primitive token, or express one category shared by Semantic and
Component tokens but excluded from Primitive tokens.

Local tests establish Studio behavior, not upstream acceptance. The existing
`leonardo-flat-taxonomy-v1` packet is a local review format; adding tier
metadata there does not make an upstream token schema accept it.

## Agent implementation brief: scale index tiers

This brief covers only crosswalk rule XW-018 (see
[taxonomy-crosswalk.md](taxonomy-crosswalk.md)). The token-level tier field
above needs its own review first.

1. On a separate design-data branch, add the optional `allowedTokenTiers`
   property shown above to
   `packages/design-data-spec/schemas/field.schema.json`.
2. Set `"allowedTokenTiers": ["primitive", "semantic"]` in
   `packages/design-data/fields/scaleIndex.json`. Leave other fields without
   it, which means all tiers.
3. Do not change token UUIDs, names, values or serialization positions.
4. Run `moon run design-data:validate`, `moon run sdk:codegen` and
   `moon run sdk:codegen-check`. Add changesets for `@adobe/design-data-spec`
   and `@adobe/spectrum-design-data`, then run
   `node tools/changeset-linter/src/cli.js check --fail-on-warnings`.

After it merges, Studio deletes XW-018 and regenerates
[design-data-handoff.md](design-data-handoff.md).

## Limits and non-goals

- No published schema, SDK, canonical corpus, or pinned historical output is
  changed by this draft.
- No automatic tier inference for external tokens or component assignments.
- No new component generator, dependency policy, browser filter, dashboard,
  Figma property-group scope, or taxonomy hierarchy.
- Existing Impact roll-ups still describe generated-output groups. This change
  does not add Component-tier metrics or make those roll-ups tier-aware.
- Unclassified saved manual tokens need explicit review. An enum value of
  `unknown` is not introduced.
- Existing source-assessment pins can become stale when watched models change.
  This work does not refresh them or declare reference alignment.

## Keep this draft current

When a feature starts using token tiers, add its consumer, behavior, test or
review evidence, and the limitation without tier data to the evidence table.
Distinguish implemented behavior from a proposed use. Record unresolved
decisions and limitations here before submitting the RFC; do not treat local
feature completion as schema approval.
