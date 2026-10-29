---
name: formula-engine
description: How formulas, interpolations, rules and dimension scales work in spectrum-studio. Use when touching the Logic page, scale types (formulas), custom expressions, interpolations, bindings on scales, rounding, scale-naming or t-shirt-sizing rules, the shared dimension-scale engine used by spacing, size and radius, or any code that generates a scale of values. Covers the vocabulary, the single generation path, the expression grammar, rule references and integrity, and known debt not to copy.
---

# Formula engine (the Logic page)

Code: `src/features/scales/` (formulas, interpolations, the generator, dimension scales) and
`src/features/logic/` (rules, libraries, references, integrity). UI: `src/pages/Logic.tsx`,
`src/pages/logic/`, `src/views/logic/` (`FormulasView`, `RulesView`, `ScaleTypePreviewView`,
`TypeScaleComparison`), `src/panels/logic/`, `src/components/logic/`. Roadmap: EPIC-1.9 (formulas,
interpolations, dimension scales), EPIC-5.1 (rules), EPIC-2.3 (bindings); EPIC-9.1 is the long-horizon
goal of platform-independent formulas, which is why formulas stay declarative. Mode dials and
binding semantics are in the `modes` skill; token output is in `tokens`.

## Vocabulary: keep it

- **Formula**: the UI and roadmap word. The code keeps `ScaleType` and `scaleTypeId` so it does not
  collide with spacing, size and color scales. Do not rename either side.
- **Interpolation**: a reusable named shape (a method or an expression). It replaces the old word
  "curve". `InterpolationMethod` is `linear`, `cosine` or `exponential`.
- **Rule**: a reusable policy referenced by id: `rounding`, `scale-naming` or `tshirt-sizing`.
- **Binding**: the link from a formula part to a mode parameter. **Dimension scale**: a formula plus
  the range, overrides and bindings of one scale in spacing, size or radius.

Do not invent parallel terms; new concepts reuse the taxonomy (roadmap principle 1).

## Formulas (`scales/scaleType.ts`)

A `ScaleType` has a `kind` (`type-scale`, `geometric`, `linear` or `expression`), `parameters`, and a
`base` (the value at index 0). Each part has two flags: `overridable` (a foundation may set its own
value) and `adaptable` (a foundation may bind it to a mode parameter). A locked adaptive part keeps
the formula value at the neutral position. **A formula never defines steps**: each foundation owns
its range (`below` and `above`) and any overrides; the library never holds a scale's steps.

Shipped formulas: Type scale, Spacing, Size, Radius, and the elevation formulas
(`elevation/formulas.ts`). Locked entries cannot be edited or deleted. `scaleTypeIssues` returns
human-readable problems and is the gate before saving; `isScaleType` is the shape check.

## Custom expressions (`scales/expression.ts`)

A restricted arithmetic grammar for custom formulas and interpolations. It has no `eval` and no
`Function`: the source is parsed into an AST that supports numbers, named variables (`i`, `base` and
the parameter ids for formulas; `x` for interpolations), `+ - * / ^`, unary minus, and a whitelist
of functions (`pow`, `min`, `max`, `abs`, `round`, `floor`, `ceil`, `clamp`, `sqrt`, `log`, `exp`).
Source is limited to 500 characters and a recursion depth of 200. Extend the whitelist deliberately.
**Never evaluate source text any other way.** Function names are reserved and cannot be parameter
names. `expressionLatex.ts` renders an expression for display.

## One generation path

`generateScale(settings, library, modeValues)` (`scales/generate.ts`) is the single path that preview,
tokens and change tracking use. Call it; do not recompute values elsewhere.

1. Resolve the formula and the rounding rule (missing ids fall back to hidden defaults).
2. `resolveScaleInputs`: parameter overrides apply first, then bindings (a binding wins) from the
   given mode parameter values. A new binding starts neutral, so it changes nothing until an end is
   edited. The `base` key binds the scale's base.
3. For each index from `-below` to `+above`: the raw value, the rounding factor, the rounded value,
   and the step name (`stepNames.ts`). The range clamps to at most 9 below and 40 above.

`generateDimensionScale(prefix, scale, rules, scaleTypes, modeValues)` (`scales/foundation.ts`) adds
the token names and is the path spacing, size and radius use. `generateDerivedScale` maps one scale
through an interpolation. `createDimensionFoundationState` (`foundationState.ts`) is the shared
state factory for these foundations; new dimension foundations use it, as `radius` and `size` do.
Values must be finite, positive and distinct (`scaleIssues`); radius uses the non-negative policy
(`scales/issues.ts`). Problems are reported as issues on the scale, not as thrown errors.

**Typography is the special case.** The `type-scale` formula alone carries `textSizeAdaptation` (an
interpolation plus ratios at the smallest and largest text size) and always follows text zoom.
`scaleTypeIssues` forbids changing its identity or kind. Component size currently lives in
typography temporarily (`AGENTS.md`).

## Rules (`logic/model.ts`)

- **Rounding**: a depth (1, 10, 100, 1000), a default outcome, and ordered conditions (first match
  wins). A factor of 0 leaves the value unrounded. Used by typography, spacing, size and radius via a
  `roundingRuleId` on each scale. Built-in rules are `locked`.
- **Scale naming**: base label, above increment, and automatic or fixed below-base increments; used
  by color scales with custom contrast steps. Standard rule: `STANDARD_SCALE_NAMING_RULE`.
- **T-shirt sizing**: maps component sizes to registry size terms, with movement `available-token` or
  `scale-index`. This belongs to EPIC-5.1 and Structures; it must build on product component size
  (EPIC-2.5). Keep to what is documented here and ask before changing it.

Every rule is referenced by id. `logic/consumers.ts` (`ruleConsumers`, `consumersOf`,
`draftRuleImpact`, `reassignConsumers`) finds every consumer so an edit shows its impact and a
deletion requires a replacement. Deleting a rule or formula returns a removed record for scoped Undo
(`removeRuleAtom`, `deleteScaleTypeAtom`). A rounding rule cannot name steps, a naming rule cannot
round values, and a generation rule cannot round foundation values; the consumers file enforces
this. The same applies to formulas (`scaleTypeConsumers`, `ignoredOverrides` for overrides a formula
edit would make inert).

## Persistence, Changes and Impact

Rules, formulas and interpolations are persisted libraries (`rulesAtom`, `scaleTypesAtom`,
`interpolationsAtom`) and part of the authoring snapshot. Follow `authoring-lifecycle` and
`changelog-parity.mdc` when adding or changing library data.

## Known debt and what not to copy

Open items are in `docs/known-debt.md`. Follow Working rule 5 in `AGENTS.md`. Do not copy:

- `normalizeRuleState` (`logic/integrity.ts`): it silently resets edited built-in rules, adds migrated
  rules, and reassigns a missing rounding rule to Whole numbers, and reports only through a dev
  console warning. Corrections must be shown to the user.
- Throwing for invalid library data on a load path; return issues. (Edit-time validation in the
  add and replace atoms may throw, as it does today.)
- A second generation path, a second expression evaluator, or renamed vocabulary.

Per the roadmap, radius, elevation and motion are still adopting the shared engine (EPIC-1.9).

## Checks

`test:scales`, `test:scale-library`, `test:logic`, `test:logic-formulas`, `test:tshirt-sizing`,
`test:tshirt-integration`, `test:spacing`, `test:size`, `test:radius`, `test:dimension-analysis`;
`test:changelog` and `test:impact` when persisted library data changes. Browser: `logic.spec.ts`,
`spacing.spec.ts`, `radius.spec.ts`, with `pageerror` asserted empty (`verify-change`).
