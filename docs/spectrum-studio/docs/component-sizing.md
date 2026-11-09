<!-- Copyright 2026 Adobe. All rights reserved. -->

# Component and text sizing

The **Scale** mode set has two shipped modes: **desktop** and **mobile**.
It controls two independent baselines:

| Parameter      | Authoring location           | desktop | mobile                       |
| -------------- | ---------------------------- | ------- | ---------------------------- |
| Component size | Size > System settings       | 100%    | 125%                         |
| Base text size | Typography > System settings | 100%    | 17/14, approximately 121.43% |

Both parameters ship with **Modal** enabled. Edit their percentages through
the existing foundation mode controls.
Percentages display two decimal places when not focused and expose the stored
precision while editing. Changing the selected mode is a preview choice, not
an authored change.

## What owns the values

The shared base is `system.componentSizing.componentSize`. Typography owns
`system.foundations.typography.textSize`. Both store positive, finite
multipliers: 1 means 100%. Non-default modes can override either parameter.
The default mode inherits its foundation base and does not store overrides.

The mode set uses the native key `scale`, with `desktop` and `mobile` mode keys.
Its stable set and mode IDs are unchanged. These keys match the reference mode
declaration directly; no export alias or reviewed mapping is needed.
Generated token IDs retain their original Scale identity seed; output names,
contexts and selectors use the new keys.
New modes derive their keys from their names using the existing lowercase,
hyphenated format. Default status does not change a mode's key. Renaming
published modes is outside this change.

The existing Typography `componentSize` field is a t-shirt selection, not this
percentage.

## Base text size and Adaptive text scaling

**Base text size** sets the starting typography sizes before reading adjustments.
It is a percentage of the type formula's **Base size**, which is a measurement
such as 14px. At 100%, that base stays 14px; at 17/14 it becomes 17px.

**Adaptive text scaling**, previously labeled **Text scaling**, adjusts typography for
reading preferences without changing that baseline. It uses the integer
`typography.textZoom` parameter and retains its adaptive controls, ratio behavior
and rem output. Smaller text and headings can adjust at different rates; this is
not a second uniform percentage.

Both controls include contextual help in System settings and mode controls.
Adaptive text scaling also includes the same help in adaptive controls.
The shipped reading mode set is named **Adaptive text scaling**. Its stable
ID and `textScaling` key are unchanged. Existing saved and custom mode-set names
are not rewritten.

## How generation applies the percentages

Component size multiplies the complete raw Size and Radius progressions before
their existing rounding rules. It does not merely multiply a formula's base:
a linear progression of 24, 32 and 40 becomes 30, 40 and 50 at 125%, including
its step size. New scales in Size use the same path.

Base text size multiplies the Typography base before the existing progression,
t-shirt selection, Adaptive text scaling, line-height and workflow-icon derivations.
Component size does not multiply the Base text size result a second time.
Existing clamps, rounding choices, output units and explicit bindings remain
in place.

In Structures, Component size applies to active Generator targets that use
eligible typed geometry or Spacing references. A Spacing primitive itself
does not change: only its component use does. References to Size, Radius and
Typography already contain their resolved scaling, so they are not multiplied
again. Centered padding is recomputed from resolved minimum height and content
height; its final result is not scaled again.

Typed values without an active Generator remain constants. Global spacing, border widths,
Hug/Fill, unitless ratios, colors, opacity, elevation, motion and preview
fallback sizes are not inputs to this multiplier. Explicit token overrides
retain precedence and their original generated baselines for staleness review.
They are not multiplied after being applied.

Platform-neutral pseudocode for this first phase:

```text
componentFactor = resolve owned Component size override, or its shared base
textFactor = resolve owned Base text size override, or its Typography base

geometry = existingRounding(evaluateCompleteFormula() * componentFactor)
typography = existingTypographyDerivation(authoredTextBase * textFactor)
padding = deriveFromResolvedHeightAndContent()
```

The generators, previews, native output, Components, Changes and Impact consume
these shared derivations. Only modes that own a parameter add published values
for it. Adding Scale does not double unrelated spacing or color inventories.

## Reference differences

The reference font sizes can be reproduced with bases of 14px and 17px, ratio
1.125, three positions below the base, fourteen above it, and nearest-whole-pixel
rounding. The focused check compares all 36 values. Enabling Scale does not
silently select that rounding rule or expand an authored type scale.

Other values are not an exact historical reconstruction. Proportional padding
deliberately differs from five reference Base horizontal-padding pairs that
decrease on mobile: S 10 to 8, M 12 to 10, L 16 to 12, XL 18 to 12 and XXL
20 to 14. Proportional component radius is requested behavior, not a claim
that canonical Radius primitives have a desktop/mobile split. Icons and line
heights retain their authored derivations; exact historical parity is not
claimed. Canonical reference data is unchanged.

## Output and runtime responsibilities

Native output retains the authored mode keys. Typography CSS adds selectors
such as `[data-scale="mobile"]`, including combinations with the
existing `[data-text-zoom]` attribute. Consumers must apply those attributes
and select the appropriate mode. CSS and native exports remain static outputs,
not implementations of a product's adaptive UI.

Saved-data upgrades initialize missing bases to 100%, upgrade the unchanged
shipped Platform scale set, and preserve independent saved and working edits.
Customized modes or conflicting capability ownership are retained and reported
for review. A deliberately deleted current-version Scale set is not reseeded.
Envelope 27 updates the shipped set's old `platformScale/default` keys to
`scale/desktop`, including component conditions and saved mode choices, without
changing IDs or values. Native imports use the same upgrade. Key conflicts are
reported rather than overwritten.
See the [storage contract](design-data-authoring-storage-contract.md).

## Future work: adaptive adjustment and engineering guidance

**Not implemented in this phase:** adaptive Component size is a further uniform
multiplier on both resolved modal baselines. It must not replace either one.
Before final rounding, the agreed examples are:

| Context                    | Component authored as 32px | Text authored as 14px |
| -------------------------- | -------------------------- | --------------------- |
| desktop                    | 32px                       | 14px                  |
| mobile                     | 40px                       | 17px                  |
| desktop plus adaptive 150% | 48px                       | 21px                  |
| mobile plus adaptive 150%  | 60px                       | 25.5px                |

Its bounds, increments, precision, reset behavior, behavior when switching modes,
and any conversion into saved modal factors require a separate decision and
implementation. Spacing density is separate work.

A deferred engineering-facing feature must explain **all adaptive behavior**,
not only Component size. It should derive implementation guidance from authored
parameters, relationships and formulas. Instructions, diagrams and worked
methods are candidate presentations, not committed UI scope. It must explain
runtime composition, mode selection, independent adjustments, units, rounding
and export limits without promising that static tokens implement continuous
adaptation. That communication feature remains a separate tracked deliverable.

## Executable checks

- [Core sizing](../tests/component-sizing.ts): independent factors, full raw
  progressions, exclusions, reference font sizes, CSS/comparisons, artifact
  round-trips and explicit override precedence.
- [Structure sizing](../tests/component-sizing-structures.ts): eligible values,
  exactly-once references, centered padding, nested reuse, excluded targets,
  preview agreement and identities.
- [Authoring lifecycle](../tests/component-sizing-lifecycle.ts): independent
  upgrades, saved precision, default/modal editing, Changes/reset, real Impact,
  Save, Cancel and reload.
