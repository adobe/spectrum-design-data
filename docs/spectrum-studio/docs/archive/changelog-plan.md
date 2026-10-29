# Changes comparison contract

Changes contains Overview and Log. Both compare working design data with shipped
defaults, including unsaved edits and excluding selected modes, temporary adaptive
previews, appearance, and navigation. Save does not clear differences from shipped
defaults; Cancel restores the saved design. Confirmed Reset all replaces working
and saved data with shipped defaults.

## Shared coverage

`features/changelog/registry.ts` registers every `EditSessionSnapshot` domain and
the separately persisted foundation-mode attachments. It owns authored slots,
stable source/field addresses, exclusions, labels, Log groups, and Overview scope.
Existing generators remain the source of token output; the explicit snapshot
adapter in `tokens/browserSavedState.ts` does not read preview or selected-mode state.

`comparisonState.ts` combines the authored comparison with one primitive/semantic
token comparison. `tokenComparison.ts` groups by stable concepts and scoped value
identities, comparing final working output with shipped output once. Authored
override storage contributes to System impact; its token card displays final
output and override state without a second storage-diff card. Dormant or
unresolved authored edits stay visible when no output field represents them.
Compatibility aliases stay distinct from canonical concepts.

`pnpm check:changelog-coverage` runs in type checking/lint. It checks exhaustive
snapshot registration and the independently reviewed authoring-schema property
shape, including nested types and union variants. Runtime/unit checks reject unregistered domains, check union inventory
uniqueness, and exercise source/field resets. A schema fingerprint update requires
coverage and fixture review; it is not upstream alignment evidence.

Immutable collection IDs, schema markers, edit timestamps, and recovery baselines
are not independent authored values. Nested objects use labeled field paths;
ordered collections are logical fields, preserving order as authored data rather
than counting every JSON leaf. A Log field can summarize several generated values.
Registry-projected source names are not counted again as authored names.

## Overview

| Section | Headline and segments |
|---|---|
| System impact | Changed authored slots divided by the shipped/working union. Segments cover Foundations, Registry, Formulas/interpolations, Rules, Modes, Platforms, Design, Components, and token authoring. Generated outputs are excluded. |
| Foundational impact | Foundation-owned authored values, including mode-specific values, grouped by Color, Typography, Spacing, Size, Corner radius, and Elevation. Explicit generator exceptions are reported separately from ordinary mode presets and token overrides. |
| Design impact | Authored Structure values, with structures affected reported separately. |
| Token impact | Affected token concepts in primitive and semantic segments; detailed rows distinguish values, references, resolved values, and manual overrides. |
| Component impact | Authored component declarations and relationships, with components affected reported separately. |

System, Foundational, Design and Token details use small, quiet, compact Spectrum
disclosures labeled "Breakdown" with 14 px headings. Only System starts expanded.
Charts and headline totals remain visible; Component impact remains uncollapsed.

Segments contribute their changed counts to the section-wide denominator; their
unrounded sum equals its headline percentage. Table percentages use category-local
denominators and show changed/total counts. Sections overlap intentionally and
their percentages must not be added together.

The union preserves both additions and removals. Scoped values use actual owner
axes, not unrelated Cartesian samples. When a manual override introduces an axis,
both comparison sides use its union scope so inherited unchanged values are not
fabricated as removals/additions.

Spectrum hues and textual breakdowns distinguish segments without relying on
color alone. Zero means a complete, nonempty inventory with no differences.
No-data/unimplemented states do not add fictitious data. Themes, Motion, and Styles
do not acquire models or denominators through this change.

Unavailable generated output retains known authored comparisons and shows an
explicit error. It cannot silently shrink Token impact to a successful percentage.
Saved/reference inventories used elsewhere keep their own explicit context.

## Log and reset behavior

Accordions count changed fields, not cards. Each changed mode-value row counts
once. Cards retain category icons, New/Modified/Removed badges, typed previews,
red original/green updated values, and generated wand markers. An existing token
newly marked deprecated shows Deprecated; New and Removed take precedence.

Concise Value/Output/Reference rows group their labeled context subrows. Unsupported
previews remain text with a reason rather than an invented visualization.

`resetPlans.ts` restores stable registered addresses through the existing lifecycle
owner. Every candidate is checked before mutation, and stale cards or invalid
references produce visible errors. Individual source fields preserve unrelated
changes; whole-card resets restore that object or its registered changed fields.
Removing a manual override reveals current generation, which may still differ
from shipped output.

Shared Static value resets address the active source override, not dormant
mode-specific edits. Mode-set metadata resets leave separately displayed child
mode changes untouched. Generated dependencies identify the contributing scale,
metric, palette links, formula, rule, and declared mode context rather than
offering every simultaneous edit in a foundation.

Generated fields require an alert dialog. A supported primitive value can be
pinned to its shipped value in one explicitly selected full authoring context.
Owner-scoped rows that cover multiple contexts offer those choices individually;
no arbitrary context is selected silently. Alternatively, select a specific
changed upstream field and acknowledge its downstream effects.

Semantic outputs, palette write-through values, shared Static all-mode values,
locked formulas, removed/new values without a shipped counterpart, and unsupported
compound editing do not gain an independent override. Their restrictions are
explained, with upstream choices where available.

Tokens category reset offers manual clearing or upstream selection. Manual clearing
retains compatibility aliases and dormant Static mode values; aliases have their
own source reset. Topic/global resets are confirmed, and read-only mode cannot
mutate data. Cancellation and rejected candidates leave working and saved data
unchanged.

## Verification and limits

The Changes suites cover exhaustive registration, schema-shape rejection, stable
union identities, clean shipped output, non-color generation, preview exclusion,
precise bar arithmetic, contextual values, statuses, overrides, scoped resets,
stale/dependency rejection, and lifecycle behavior. New display/reset components
have focused approved Storybook states and interactions.

Final local verification passed the Changes, impact, value-preview and affected
persistence, Size, Component, alias, t-shirt, shadow and color-output checks, plus
type checking, lint, production and Storybook builds. All 15 application and 13
Changes Storybook browser paths passed with no page errors. These include
mode-selection independence and atomic rejection of contrast-invalid shipped
color overrides.

Broader validation found existing fixture limitations in Modes, Typography,
Spacing, Radius and Elevation: impossible contrast targets, source removal with
live Component dependencies, and empty or duplicate mode identities. Those
fixtures were not changed as part of this work. Focused verification does not
claim a repository-wide clean test run. Lint retains an existing Fast Refresh
warning in `ColorPickerDefaults.tsx`.

The always-applied project rule is `.agents/rules/changelog-parity.mdc`.
New persisted domains must extend registration, comparison, impact, reset policy,
and tests rather than only updating a source list.

This is local Changes coverage, not Home health measurement, upstream schema/SDK
conformance, or manual architecture acceptance. No new foundation/theme/style
editors, semantic override model, GitHub backend, storage migration, or roadmap
status change is introduced.
