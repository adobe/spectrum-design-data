---
name: token-alignment
description: Work through Spectrum Studio migration-analysis gaps in bounded token-family chunks. Use when aligning generated tokens with design-data, diagnosing name or value differences, or repeating the reviewed color-palette workflow for another token type. Requires individual user approval before every formula or parameter change.
---

<!-- Copyright 2026 Adobe. All rights reserved. -->

# Token alignment

Read `AGENTS.md`, `docs/token-alignment-workflow.md`, and the existing
`parametric-systems-design`, `design-data-contract`, `taxonomy-vocabulary`,
`authoring-lifecycle` and `verify-change` skills. Read the relevant foundation
skill as well. Keep changes inside Studio.

## Procedure

1. Choose one bounded family or chunk. Record working/saved/shipped input,
   reference revision and hashes, freshness, required contexts and exclusions.
   A downloaded report is not an authoring snapshot. Never claim access to
   current browser working data from a shipped-default comparison.
2. Identify authored owner -> shared derivation -> consumers using actual model
   and function names. Reuse Registry terms, references, generators and
   comparison owners; do not build a parallel resolver or naming engine.
3. Separate identity, names, classification, availability, context coverage and
   values. Equal values or labels never establish identity. Unmatched, partial
   or stale evidence stays unable to assess until confirmed.
4. For names, use category and term inclusion in Registry. Omitting the Color
   Property term changes projected names while retaining `property: color`.
   Check other terms, collisions, IDs, structured output and compatibility
   aliases. Term inclusion is shared, not a palette-specific exception system.
5. Before **every** formula or parameter intervention, present the affected
   source and contexts, current results, proposed change, simpler alternatives,
   downstream effects and reset behavior. Ask the user to approve that one
   intervention before changing it. Never bundle independent changes. General
   plan or implementation approval does not grant this permission. Explicitly
   approved, bounded experiments may change independent in-memory clones, not
   shipped defaults or the user's saved/working data. Review measured results
   and obtain separate approval before persisting a candidate.
6. Prefer simple generated output within the accepted tolerance over many key
   colors for exactness. For colors, use existing Delta E 2000 below 2 with
   matching alpha; report exact equality separately. Do not tune automatically,
   bulk-copy reference outputs, add manual overrides or change tolerance to get a pass.
   A selected reference color may supply an explicitly approved trial's authored
   key input; this is not permission to copy generated outputs. Preserve normal
   conversion precision and use existing color helpers.
   If approval is unavailable, preserve the source and report remaining work.
7. Add focused tests, including upstream propagation and unrelated consumers.
   Verify Save/Cancel/reload, Changes, scoped Impact and reset for authored
   changes. Compare the same pinned requirements before and after. Keep concepts
   and mode values separate; filtering cannot change the denominator.
   Verify the intended configuration is in shipped defaults, not only in a
   modified test fixture. Exercise the Analysis comparison and table-data path
   for defaults and restored saved/working records. Distinguish required
   counterparts from additional app-only mode variants.
   Confirmed extra variants belong only under Enhancements in the visible
   comparison, identified by selected source record and exact mode context.
   Preserve unresolved inventory and the complete report; removing duplicate
   presentation must not change required counts, values or scores.
8. Use existing Analysis/JSON/Markdown assessment paths. Ask separately before
   app-page browser checks or gated SDK/report commands. Respect one-heavy-job
   limits. Do not refresh historical pins or repair unrelated failures.
   Record the browser URL, selected app source, reference and filters. Shipped
   defaults is the app input, not a defaults self-comparison. A Working-only
   check, unrelated screenshot or timeout cannot verify the Shipped view.
9. Record results, evidence, approved interventions, limitations and the next
   chunk. Link the existing gap owner without treating local tests as upstream
   acceptance. Ask separately whether to create a local commit when the
   implementation is complete. Never push automatically.

## Proven scope and stopping conditions

The naming slice verifies configurable term omission and unchanged value
assessment across all represented base palettes. The Blue key experiment
demonstrates a bounded source-input comparison, not a general tuning method.
Its midpoint trial reduced four required failures to three; the largest-error
trial worsened the worst error. Neither trial has been applied to defaults.
See the workflow for measured results and the remaining approval boundary.

## Sparse source-input experiments

1. Establish the current failures, reference requirements and authored owner.
   Do not choose inputs from a stale report or confuse a missing counterpart
   with a numerical difference. Record control hashes and source IDs.
2. Obtain approval for a small, explicit experiment budget. Change one input
   in each independent clone of the same baseline. Do not introduce a general
   optimizer, combine independent interventions or expand the budget silently.
3. Use the existing generator and actual Analysis assessment/table-data path.
   Measure the whole affected domain, direct downstream output and unrelated
   consumers. Keep identities, contexts, required counts and alpha fixed.
   Unavailable alias/cascade resolution is a limitation, not proof of no impact.
4. Reject any candidate that makes an acceptable required value fail, removes
   output, produces a generation error, changes alpha or changes requirements.
   Among eligible trials, prefer fewer remaining failures, then lower worst
   error. Report worsened existing failures even when a candidate ranks first.
5. Present the exact source diff and trade-offs for individual approval.
   Prefer the fewest authored inputs that meet the existing acceptance policy.
   If no candidate improves safely, recommend no change. Partial progress is
   not full alignment. A second input needs a new reviewed experiment.
6. Only after approval, apply to the intended source and repeat the same
   assessment from actual shipped defaults without test-only edits. Cover
   controlled reset and lifecycle behavior; do not overwrite browser data.

For **color only**, compare a key at the middle of the main contiguous failing
region with a key at the largest measured Delta E. The main region has the most
failing steps; break equal-region ties by worst error. For two middle tokens,
choose the one with larger error. If both strategies select the same token,
run one unique trial. Use a confirmed required reference color, parsed by
`concreteColor`, converted to OKLCh with authored chroma
`(chroma / MAX_CHROMA) * 100`, without early rounding.

A key shapes a shared ramp; it is not a Dark-only token override. Preserve
existing stops and settings. If it coincides with an existing stop position,
stop for review rather than silently replacing it. Contrast targeting and
serialization mean inserting the reference color need not reproduce that
token's output or improve its neighbors.

Other token types reuse the controlled-experiment procedure, not color keys,
Delta E or these candidate-selection heuristics. Identify their authored
parameters and existing acceptance rules first.

Keep unmatched static/transparent colors separate from generated base palettes.
Later token types reuse this procedure, not color-specific thresholds.

Stop changing authored data when a required intervention lacks individual
approval. Continue safe diagnostics and tests, then report that boundary.
An unresolved chunk can be handed off but cannot be called fully aligned.
