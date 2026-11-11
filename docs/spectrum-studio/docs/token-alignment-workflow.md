<!-- Copyright 2026 Adobe. All rights reserved. -->

# Token alignment workflow

Use migration analysis to identify a bounded group of differences, correct their
shared source, and check the same records again. Start with one family before
repeating the process across a token type.

This workflow supports INIT-7 and the shared Registry naming work in LTAX-002.
The gap register remains the authority for alignment status. A passing local
test does not establish upstream acceptance.

The [master migration plan](master-migration-plan.md) distinguishes this
refinement workflow (M2) from exact package-wide reproduction (M3).
Color tolerance remains useful for reviewing simple generator/default changes;
it is not final migration acceptance. Residual exact-value overrides require
separate justification and approval through the existing authoring lifecycle.
This clarification changes neither thresholds nor parameter-approval procedures.

## Record the baseline

For each chunk, record:

| Field       | What to record                                                           |
| ----------- | ------------------------------------------------------------------------ |
| Scope       | Token type, families, source IDs, required mode contexts and exclusions  |
| Inputs      | Working, saved or shipped data; reference revision, hashes and freshness |
| Identity    | Established counterparts or reviewed mappings, including ambiguity       |
| Differences | Names, classification, availability, mode coverage, values or resolution |
| Ownership   | Authored definition, shared generation path and affected consumers       |
| Correction  | Proposed change, alternatives, expected effects and user approval        |
| Evidence    | Checks, before/after results and unresolved requirements                 |

A downloaded analysis report is evidence, not an authoring snapshot. Do not copy
its values into defaults. If the current working source is unavailable, compare
shipped defaults explicitly; matching totals do not prove the working data is
the same.

Classify records as New, Missing, Inconsistent or Aligned. Keep unconfirmed or
stale records unable to assess. An unmatched record is not confirmed missing,
and matching names or values cannot establish identity.

Keep concepts separate from required mode values. Use the contexts required by
the reference rather than every possible combination of app settings. Retain
unresolved requirements in totals; do not improve coverage by filtering them out.

## Correct names without changing classification

Shipped defaults omit the Color Property term, producing names such as
`blue-100`. In edit mode, open Registry, select Property, and find Color to
change **Include in names and hierarchy**. Review and apply the change.
Save retains the choice; Cancel restores the last saved choice.

The category checkbox is still the overall inclusion switch. A term can be
omitted independently but cannot make an excluded category appear. Terms without
a saved choice retain the existing category behavior.

The setting changes names and hierarchy, not the structured classification.
`property: color`, token types, identities, values and mode contexts remain
intact. Other Property terms retain their names. Name collisions remain
diagnostic and the existing edit validation rejects conflicting proposals.
Existing Save-time compatibility aliases keep their normal behavior.

This minimum controls a shared term wherever it is assigned, including semantic
colors that use it. It is not a per-palette exception system. Do not add a
conditional naming engine or free-text token names to work around that boundary.
Authoring record version 29 applies this default independently to older saved
and working records when the shipped Color term has no explicit inclusion
choice. Explicit inclusion or omission, other Registry terms, values, identities
and unrelated edits are preserved. Reload restores the updated records; a broad
Reset all is not required.

The data path is:

`TaxonomyDocument` and `TaxonomyTerm.includeInProjections`
-> `projectClassification`
-> token names, hierarchy, Analysis and output.

## Review value changes individually

Color values follow `ColorSystemDocument` -> `resolveColorDocument` -> existing
scale/dynamic generators -> tokens, previews, Analysis and export. Change the
authored source, not a second calculation in a consumer.

Before **each** formula or parameter change, present the affected scale and
contexts, current differences, proposed change, simpler alternatives, effects on
other consumers and reset behavior. Obtain the user's approval for that specific
change before making it. Plan approval is not parameter approval.

This includes interpolation, stops or key colors, contrast targets, mode dials,
shared settings and defaults. Prefer a simple result within tolerance over many
added key colors for exactness. Do not automatically copy reference values,
introduce overrides or relax tolerance. If approval is unavailable, leave the
source unchanged and report the remaining differences.

Explicit approval for bounded trials permits changing independent in-memory
copies, not the shipped source or saved/working authoring data. A confirmed
reference color can supply an approved trial's authored key input. This does
not permit copying reference values into token overrides or replacing outputs.
Review the measured candidate and obtain separate approval before applying it.

For colors, reuse the existing policy: Delta E 2000 strictly below 2, with
matching alpha. Report exact normalized equality separately. Do not round a
distance before deciding whether it passes. Other token types need their own
existing comparison policy; color tolerance does not apply to them.

## Verify the chunk

Add focused tests for new behavior. Change one upstream input and check affected
consumers, unchanged unrelated consumers, and preview/output agreement. For
persisted fields, cover Save, Cancel, reload, Changes, scoped Impact and reset.
Temporary previews must not change authored inventories.

For naming, check displayed names separately from structured fields, values,
IDs, context counts and collision handling. A name-only change should appear as
a name change, not a value change. Use existing comparison owners for Analysis,
JSON and Markdown rather than calculating a second score.

Choose checks with `verify-change`. Start with the narrowest script and run
one resource-heavy job at a time. Ask before app-page browser checks, after the
feature is complete; assert no page errors if permission is granted. Do not
repair unrelated failing checks or refresh historical evidence pins to obtain
a passing result.

End each chunk with exact, acceptable, outside-tolerance and unable-to-assess
results. Keep missing records and approved exceptions visible. A reviewed chunk
may retain unresolved work, but must not be described as fully aligned.

## Color starting evidence

The attached working report and a read-only shipped-default comparison at
`e5311a86e46111d8151e70f94fd77c3b73e247e9` produced the same aggregate counts:
413 active palette concepts, 301 represented concepts across 19 generated
families, 12 exact concepts and 177 additional acceptable concepts.
The generated scope has 112 concepts outside tolerance. Another 112 unmatched
static/transparent concepts remain outside this implementation pass.
These are baseline observations, not live coverage promises.

| Generated family | Concepts | Exact | Acceptable, not exact | Outside tolerance |
| ---------------- | -------- | ----- | --------------------- | ----------------- |
| Gray             | 13       | 2     | 8                     | 3                 |
| Blue             | 16       | 0     | 12                    | 4                 |
| Brown            | 16       | 0     | 13                    | 3                 |
| Celery           | 16       | 0     | 1                     | 15                |
| Chartreuse       | 16       | 0     | 12                    | 4                 |
| Cinnamon         | 16       | 1     | 12                    | 3                 |
| Cyan             | 16       | 1     | 11                    | 4                 |
| Fuchsia          | 16       | 1     | 5                     | 10                |
| Green            | 16       | 0     | 9                     | 7                 |
| Indigo           | 16       | 0     | 7                     | 9                 |
| Magenta          | 16       | 1     | 5                     | 10                |
| Orange           | 16       | 0     | 8                     | 8                 |
| Pink             | 16       | 1     | 12                    | 3                 |
| Purple           | 16       | 0     | 11                    | 5                 |
| Red              | 16       | 1     | 11                    | 4                 |
| Seafoam          | 16       | 1     | 12                    | 3                 |
| Silver           | 16       | 1     | 12                    | 3                 |
| Turquoise        | 16       | 1     | 12                    | 3                 |
| Yellow           | 16       | 1     | 4                     | 11                |

Light, Dark and Wireframe at Regular contrast are the required generated-palette
contexts in this baseline. Every represented blue concept has all three.
`blue-100` is already acceptable in each; renaming it is not a color correction.

The four blue differences to review are all Dark / Regular:

| Concept  | Studio value      | Reference value   | Delta E 2000 |
| -------- | ----------------- | ----------------- | ------------ |
| blue-500 | rgb(28, 56, 174)  | rgb(26, 58, 195)  | 2.521        |
| blue-600 | rgb(38, 71, 208)  | rgb(37, 73, 229)  | 2.431        |
| blue-700 | rgb(46, 84, 237)  | rgb(52, 91, 248)  | 2.651        |
| blue-900 | rgb(80, 120, 247) | rgb(86, 129, 255) | 3.133        |

Distances in this table are rounded for reading only. No palette formula or
parameter change is approved by this document. The next value step is to
diagnose a shared cause and bring one proposed intervention to the user.

The report does not establish SDK binary freshness or complete alias/cascade
resolution. Keep those limitations separate from direct primitive comparison.
The general audit threshold of 0.1 is not the palette acceptance policy.

## Sparse Blue key experiment

The shipped-only experiment at checkout
`e5311a86e46111d8151e70f94fd77c3b73e247e9` refreshed the baseline through
`computeAnalysisComparison` and its `colorOpacity` assessment. There are 16
Blue concepts and 48 required Regular values: Light, Dark and Wireframe.
The actual failing Dark regions are 500/600/700 and 900. Do not substitute
an example region such as 600/700/800 for measured requirements.

Blue's authored owner is `scale-48`, with Registry family term
`6bbab90f-8ed6-4b4f-a6fa-e6b5937c7615`, four existing stops and RGB
interpolation. Two independent cloned-data trials each added one shared
key without changing the existing stops, contrasts, modes or output settings.

| Input                                        | Required failures | Largest Delta E | Newly failing values | Result              |
| -------------------------------------------- | ----------------- | --------------- | -------------------- | ------------------- |
| Unchanged shipped Blue                       | 4 / 48            | 3.133           | —                    | Control             |
| Middle of main failing region: Dark Blue-600 | 3 / 48            | 3.133           | 0                    | Partial improvement |
| Largest error: Dark Blue-900                 | 4 / 48            | 3.279           | 0                    | Worse than control  |

Distances are rounded here for reading only; acceptance uses the unrounded
Delta E 2000, strictly below 2, and matching alpha. Eight required values
remain exact in all three cases. No failing value was removed from the counts.

The Blue-600 reference, `rgb(37, 73, 229)`, converts to a key with lightness
`0.4943137806556991`, hue `266.3949527271307` and authored chroma
`59.23545561358483`. Its generated Dark Blue-600 is `rgb(35, 69, 216)`,
not the key color: Delta E falls from 2.431 to 1.957, just within tolerance.
Dark Blue-500 improves from 2.521 to 2.192 but still fails; Blue-700 worsens
from 2.651 to 2.739; Blue-900 remains at 3.133. Light retains zero failures
despite four changed values. Wireframe output does not change.

The Blue-900 reference, `rgb(86, 129, 255)`, converts to lightness
`0.6380402449508944`, hue `266.7154641505721` and authored chroma
`48.258536638131524`. It produces Dark Blue-900 `rgb(77, 119, 252)`,
increasing that error from 3.133 to 3.279. All four Dark failures remain.
Light still has zero failures despite five changed values; Wireframe is
unchanged. Choosing the highest-error token is therefore not a reliable fix
by itself.

The midpoint trial changes 14 direct Blue token rows; the largest-error trial
changes 16. These totals include High variants, whose values remain valid but
have no invented reference score. Neither trial changes other palette families
or other direct token output. IDs, classification, names, contexts, required
counts and deprecated exclusions are unchanged. This direct projection does
not establish resolved semantic alias/cascade or component-impact parity.

**Status:** neither trial is applied. Approval for the proposed Blue-600
defaults change could not be collected. Shipped defaults retain all four
failures; saved/working authoring data was not read or changed. The recommendation
is one Blue-600-derived key for partial improvement, subject to that approval,
not a second automatic key or a claim that Blue is aligned.

### Repeat the bounded experiment

Run `pnpm exec tsx tests/blue-key-alignment.ts` from Studio. The check emits
JSON evidence with source/reference hashes, all required before/after rows,
full-precision trial inputs, regressions, changed direct token rows and High
enhancements. It tests region/midpoint selection and the no-new-failure rule,
checks the actual migration table-data path, preserves the source and restores
each clone exactly when the trial key is removed. It does not write defaults
or browser storage and does not invoke the reference SDK.

Use the longest contiguous failing region for the midpoint trial, breaking
equal-size region ties by their largest error. For two middle tokens, choose
the one with larger error. Compare the largest-error trial independently.
If both choose the same token, run one unique trial. Stop for review if a
key would occupy an existing stop position.

Reject newly failing required values, generation errors, lost output, alpha
changes and denominator changes. Rank the remaining trials by fewer failures,
then lower worst error. Record worsened existing failures and negative results.
If nothing improves safely, recommend leaving defaults unchanged.

This is the reusable technique: try a few approved authored inputs, measure
all their outputs, reject regressions, and review the smallest useful change.
It is not a generic optimizer. Other token types need their own source
parameters and acceptance rules; neither key colors nor Delta E transfers
automatically. A second key or a broader parameter change requires a separate
proposal and approval.

## Checks and reuse

`pnpm test:palette-assessment` includes the naming lifecycle and whole-palette
assessment checks. `tests/palette-naming.ts` covers omission, retained
classification and IDs, other terms, collisions, Changes, name-only Impact,
reset and Save/Cancel/reload. `tests/palette-assessment.ts` compares all
represented palette contexts against the reference and checks that a naming
change does not alter value results or denominators.

`tests/color-alignment-defaults.ts` exercises `computeAnalysisComparison` and
the migration table's actual row builders. It checks shipped defaults and
upgraded saved/working data without a test-only naming change. It also checks
that all three Regular blue-100 contexts have counterparts and acceptable
values. Capability tests that manually toggle a setting are not evidence that
the app ships with that setting enabled.

Confirmed additional app variants appear under **Enhancements**, not again as
App-only groups in the main comparison table. For example, the three
High-contrast blue-100 variants have no required counterpart in this primitive
reference. Their Regular counterparts are compared in the main table.
De-duplication uses the assessment's selected source records and exact mode
contexts, not display names. Unconfirmed, ambiguous and genuinely unmatched
records remain visible, including unresolved contexts within a mixed group.
The complete inventory remains in the report; required counts and scores do
not change.

**Shipped defaults** selects Studio's input for comparison against the
design-data reference. It does not compare the defaults against themselves.
Record this source, the reference and the active filters when collecting
browser evidence. A successful Working check is not a Shipped check, and a
text snapshot is not visual confirmation. Capture the exact table discussed;
an unrelated screenshot or a timed-out comparison is incomplete evidence.

Renaming cannot create a missing High reference variant. Never match High to
Regular, remove generated output or hide unresolved records to improve a score.

Use the local `token-alignment` skill for later chunks. Extend its procedure only
after a real case demonstrates a missing step. Before committing completed
implementation, request separate local-commit approval. Never push automatically.
