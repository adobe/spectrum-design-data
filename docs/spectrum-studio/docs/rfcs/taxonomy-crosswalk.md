<!-- Copyright 2026 Adobe. All rights reserved. -->

# RFC draft: taxonomy crosswalk between Studio and design-data

Status: local draft, not submitted or accepted upstream. Alignment tracking:
LTAX-023 in `src/data/design-data-gaps.json`. Scale index tiers are covered by
[token-tiers-and-category-scope.md](token-tiers-and-category-scope.md)
(LTAX-021).

## Problem

Studio's Registry uses a newer taxonomy than design-data. Some categories have
different keys (`axis` and `orientation`), some terms are spelled differently
(`extra small` and `xs`), some Studio categories have no design-data field
(`renderingBehavior`), and design-data requires `property` on every name where
Studio's taxonomy only uses Property on Semantic and Component tokens.

Before this change, Studio translated these differences in several places:
output names, identity adoption, the color/opacity assessment and the general
comparison each had their own partial copy. Migration analysis then disagreed
with output. For example, the accent scale was marked "App only" because one
matcher compared raw Studio names while another compared translated ones.

## The crosswalk

All translations now come from one file, `src/data/taxonomy-crosswalk.json`,
read only through `src/features/design-data/taxonomyCrosswalk.ts`:

- `toDesignDataName` spells a Studio name the way design-data publishes it.
  Output names, compatibility aliases and identity adoption use it.
- `toComparisonName` does the same and also drops Studio-only fields. Only
  migration analysis uses it, so output names stay unique.
- `crosswalkLifecycle` reports rules that design-data has made unnecessary.
- `crosswalkHandoff` generates [design-data-handoff.md](design-data-handoff.md).

Each rule has an id (`XW-###`), a kind, the gap and RFC that retire it, a
`retireWhen` condition and a `retireBy` owner: `design-data`, `studio` or
`decision`. Rules are only ever removed. A new difference adds a rule and a
line in this RFC; it never adds a translation elsewhere in the code.

| Kind | Meaning |
| --- | --- |
| `add-field` | design-data needs a field Studio leaves out, per token type |
| `rename-key` | same meaning, different field key |
| `rename-term` | same field, different term spelling |
| `value-type` | same field, different value type |
| `drop-field` | Studio-only field, ignored when comparing |
| `mode-default` | how design-data writes the default mode row |
| `tier` | Studio allows the field on more token tiers |

## Rules and proposed changes

### design-data changes

These are ready for an agent to apply on a separate design-data branch.

**XW-015 and XW-016: Rendering behavior and Mode behavior fields.** Studio's
Registry has `renderingBehavior` and `modeBehavior` categories for Colors on
Primitive and Semantic tokens. design-data has no matching fields.

Proposed: add two optional fields with no registry yet. Studio ships no
default terms for them; add registries when terms are agreed.

**XW-018: Scale index on Semantic tokens.** See the token-tiers RFC. Proposed:
once the field schema accepts `allowedTokenTiers`, set it to
`["primitive", "semantic"]` on `scaleIndex`.

### Studio changes

design-data's vocabulary is already the better long-term spelling for these.
Studio retires them with a Registry update and a saved-data upgrade.

| Rule | Studio change |
| --- | --- |
| XW-008 | Rename the Orientation category key from `axis` to `orientation`. |
| XW-009, XW-010 | Rename the font weight key to `weight` and the term value `regular weight` to `regular`. |
| XW-011 | Store size term values as `xs`, `s`, `m`, `l`, `xl`; keep the full words as labels. |
| XW-012, XW-013 | Upgrade saved names that still use `colorName` and `contrastValue`. |
| XW-014 | Store scale index values as numbers. |

### Needs a decision

**XW-001 to XW-006: `property` on Primitive tokens.** design-data requires
`property` on every name. Studio's taxonomy applies Property to Semantic and
Component tokens only, so primitive colors, spacing, sizes, corner radii,
shadows and opacity have none. Options:

1. design-data makes `property` optional on Primitive tokens whose token type
   already identifies it. This matches Studio's taxonomy, but changes
   design-data's only required field.
2. Studio adds Primitive to Property's allowed tiers and its foundation
   producers set the term. No design-data change, but Property returns to
   primitive names.
3. Keep the rule as a permanent, documented export convention.

**XW-007: Property term spellings.** Studio term values use spaces
(`corner radius`, `line height`); design-data ids use hyphens. Studio can
store the hyphenated ids as values. `drop shadow` is different: Studio uses it
because Attribute already owns `shadow`. Decide whether design-data adds a
`drop-shadow` property term or Studio renames its Attribute term.

**XW-017: default contrast rows.** design-data palette rows leave out
`contrast`, meaning the default (regular). Studio also produces high-contrast
rows that design-data does not publish. Decide whether design-data publishes
them, or whether this rule is the permanent reading of the cascade default.

## Agent implementation brief

Use this brief to apply the "design-data changes" above on a separate branch
of this repository. Work only from rules marked `design-data` in
[design-data-handoff.md](design-data-handoff.md).

1. Branch from `main`; do not include Studio changes.
2. For XW-015 and XW-016, add `packages/design-data/fields/renderingBehavior.json`
   and `packages/design-data/fields/modeBehavior.json`, modelled on
   `fields/contrast.json`: `kind` `semantic`, `registry` `null`, `validation`
   `none`, `required` `false`, `valueType` `string`. Use unused serialization
   positions 30 and 31 unless reviewers choose others, and say so in the
   pull request.
3. For XW-018, follow the token-tiers RFC: add optional `allowedTokenTiers` to
   `packages/design-data-spec/schemas/field.schema.json`, then set it on
   `fields/scaleIndex.json`.
4. Do not change token UUIDs, concept ids, values or existing names. Do not
   add tokens.
5. Validate with `moon run design-data:validate`, `moon run sdk:codegen` and
   `moon run sdk:codegen-check`. Add a changeset for
   `@adobe/spectrum-design-data` (and `@adobe/design-data-spec` for schema
   changes) and check it with
   `node tools/changeset-linter/src/cli.js check --fail-on-warnings`.
6. In the pull request, link this RFC and list the retired rule ids.

When the change merges, Studio updates `designDataRevision`, deletes the
retired rules, regenerates the handoff and runs the `taxonomy-crosswalk`
check. That check fails while a rule that design-data has made unnecessary is
still present.

## Limits

- No canonical data, schema or SDK is changed by this draft.
- Cascade export (`tokens/cascadeExport.ts`) still writes its own color name
  fallbacks. Its values match XW-001; moving it onto the crosswalk changes
  emitted names checked by many tests and is left for a separate change.
- Local tests show Studio's behavior, not upstream acceptance.

### Translations still outside the crosswalk

These were reviewed and deliberately left where they are:

- **Typography ID upgrade** (`canonicalIdentityUpgrade.ts`): rewrites old
  `text`/`size` names to `font-size-N` identities. It is a one-time saved-data
  upgrade, not a vocabulary difference.
- **Property → token type table** (`foundationValues.ts`): neither Studio's
  Registry nor design-data's `registry/property-terms.json` says which token
  type a property term belongs to, so the table can't be derived yet.
  Candidate design-data RFC: property terms declare their token or value type.
- **Classification standard `sourceKeys`**
  (`classification-standard.json`): maps Studio's older Registry categories to
  the proposed standard facets (LTAX-011). That is Studio old → Studio new,
  not Studio → design-data.
- **`contrastLabel` and `typographyMetric`**: live Studio naming context used by
  the ordered vocabulary, not leftover translations.
- **Reviewed mapping vs ID pairing**: a reviewed mapping still sets
  "reviewed-mapping" confidence even when the IDs also agree. This predates the
  crosswalk and does not change which rows pair.
