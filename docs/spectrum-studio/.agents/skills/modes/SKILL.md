---
name: modes
description: How modes and adaptability work in spectrum-studio. Use when touching mode sets, modes, mode parameters, adaptive claims or bindings, text scaling, color scheme or contrast modes, per-mode token values, mode selection or preview, foundation mode attachments, or when any foundation (color, typography, spacing, size, radius, elevation, motion) needs to vary by a global condition. Covers what is mode-controllable, how values are keyed by mode combination, and known debt not to copy.
---

# Modes and adaptability

Code: `src/features/modes/`. Page: `src/pages/Modes.tsx`. Controls: the `Mode*`
components in `src/components/` (see `component-catalog`). Roadmap: INIT-2,
EPIC-2.1 to 2.5. This skill describes the model and the code as it is. Where the
code and the model disagree, it says so; do not copy the disagreement.

## The model

Every token category relates to modes the same way. Do not treat modes as a color
feature.

- **Adaptive parameter:** a dial for a global condition (text zoom, contrast
  multiplier, background lightness, elevation depth and color).
- **Adaptation:** how a foundation responds to a dial. Typography uses the formula's
  text-size adaptation; color uses contrast polarity compensation; spacing, size
  and radius use scale bindings.
- **Mode:** a named snapshot of dial settings ("larger" is one text zoom, "dark" is
  one background lightness). A mode set (Color scheme, Contrast, Text scaling) holds
  modes, one of which is the default. The default mode never holds overrides; it
  edits the base document.
- **Full adaptability:** the continuous, user-controllable version. The preview
  can sit in a "custom" state between modes, and editing from it can create a new
  mode.
- **Per-mode token edit:** a manual override of one token's value for one mode
  combination, made in the token browser. A separate layer on top of generation.
  - **Allowed, never blocked.** Edge cases always exist, so never disable or
    reject these edits.
  - **Discouraged.** Each is a static override that bypasses the dials, so it
    lowers the dataset's systematicity (the System health pillar in
    `docs/ROADMAP.md`; the more per-mode static overrides, the less systematic).
    Any UI that creates, shows, or counts them must flag them as an override, not
    present them as a normal edit.
  - **Counted.** Keep them countable per token and mode (`browserEdits.ts`
    `values`), so the future metric can read them. Do not hide or merge them into
    generated values.
  - The flag is an indicator, not a warning gate: no confirm dialogs, no blocking
    (Working rule 2). Ask the user before adding new flag UI (Working rule 1).

## Mode-controllable parameters (the allowlist)

`FOUNDATION_PARAMETERS` in `modes/parameters.ts` is the explicit allowlist, and
`AUTHORING_CAPABILITIES` in `modes/model.ts` lists the capabilities. Today:
`color.backgroundScaleId`, `color.backgroundLightness`, `color.contrastMultiplier`,
`typography.textZoom`, `elevation.depth`, `elevation.color`. Anything not listed
cannot be overridden per mode. Structural data (scales, stops, how many sizes are
generated) is global, not mode-controllable.

Each mode stores its dial settings in `Mode.foundations` (type `ModeFoundations`,
`modes/model.ts`): optional `color`, `typography` and `elevation` entries, such as
Dark's background lightness or Larger's text zoom. It is the dial input per mode;
the default mode's is always empty. A binding is the other half: it lives on a scale
and says how that scale responds to a dial. Only color, typography and elevation
have dials, so only they can store settings. Spacing, size and radius have none and
follow modes only through bindings to another foundation's dial. Motion has no mode parameters and its
panel is a placeholder. For any new foundation, **ask the user** whether it gets
direct overrides or bindings; there is no default (gap LTAX-005).

Making a parameter mode-controllable touches (starting list; grep an existing one
such as `elevation.depth` for the rest): `AUTHORING_CAPABILITIES` and
`AUTHORING_CAPABILITY_OPTIONS`; `FOUNDATION_PARAMETERS` (and a `control` value if
new); `PARAMETER_FIELDS` and `baseParameterValue` in `modes/parameters.ts`; the
override type and its guard in `model.ts`; the foundation's own resolver
(`color-system/resolution.ts`, `typography/resolution.ts`,
`elevation/resolution.ts`); `components/ModeParameterControl.tsx` and
`panels/foundations/FoundationModePopover.tsx`; `modes/foundationAttachments.ts` (hardcoded names);
`changelog/tokenComparison.ts` `scopeKey` (hardcoded token types);
`impact/sources/modeFoundation.ts`; and tests (`test:modes`, `test:mode-ui`,
`tests/changelog-coverage.ts`). Add a `BINDABLE_PARAMETER_RANGES` entry (min, max,
step, neutral) to make it bindable everywhere.

## Shipped mode sets

From `src/data/design-system.defaults.json`:

- **Color scheme** (`colorScheme`): light (default), dark (background lightness,
  layer opacities).
- **Contrast** (`contrast`): regular (default), high (contrast multiplier).
- **Text scaling** (`mode-set-text-scaling`): default, larger, largest (zoom).
- One adaptive claim: `typography.textZoom` is owned by Text scaling.

## Bindings and adaptation

- A scale binding is `{ modeParameterId, method, points[{ at, value }] }` on a
  scale's `bindings`, keyed by formula parameter id or `base`. Only parts the
  formula flags adaptable can be bound.
- Precedence, from generation to display (two separate layers):
  1. **Generation** (`scales/generate.ts` `resolveScaleInputs`): a binding replaces
     the scale's own fixed parameter or base value whenever the dial has a value.
     Here "overrides" means the scale's fixed settings, not token edits.
  2. **Token display** (`tokens/browserModel.ts` `resolveBrowserTokens`): a
     per-mode token edit wins over the generated value. Each edit records the
     generated value it was made against (`baseline`). If generation later
     changes, the edit still wins and the token is flagged `stale`. It is never
     discarded silently.
- A new binding starts neutral (both ends hold the neutral dial value), so it
  changes nothing until an end is edited.
- Bindable parameters today: text zoom, contrast multiplier, background
  lightness. No shipped scale has a binding yet.
- Typography does not use `ScaleSettings.bindings`; it uses `textSizeAdaptation`
  on the formula (`typographyGeneration.ts`), and shifts its base by text zoom.
- Spacing and size are independent of text size unless a binding is authored
  (roadmap decision). `resolveModeParameterValues` resolves base, then owned
  non-default overrides, then preview, clamped to range, falling back to neutral.

## Keys, combinations, caps

- Generation and export use mode and mode-set **keys**. Per-mode token edits use
  **ids**: `canonicalTokenModeKey` is a JSON string of `[modeSetId, modeId]` pairs
  sorted by set id. Build these shapes with `selectionForModes` and
  `contextForModes` (below). `design-data/projection.ts` and
  `changelog/tokenComparison.ts` still translate between ids and keys on their own
  (see `docs/known-debt.md`). Do not change canonical
  mode keys or deduplicate stored values (target contract freeze).
- Token edits live in `tokens/browserEdits.ts`, shaped
  `{ [tokenId]: { values: { [modeKey]: { value, baseline } } } }`. Removing or
  replacing a mode or mode set prunes its values (`modes/tokenValueCleanup.ts`).
  - **Pending, not permanent.** `browserEdits` holds edits that are not yet resolved
    into the design data. All editable data (foundations, tokens, structures,
    registry) follows this pattern. Today it lives in browser storage during
    development. The intended end state (INIT-10, EPIC-10.3 "Save = commit"):
    Save commits the edits to the user's branch of the design-data repository, and
    the edits leave `browserEdits`. Not built yet. Do not treat `browserEdits` as
    the long-term home of any value, and do not build features that depend on edits
    staying there. Per-mode edits become committed per-mode token values.
- Combination caps: the number of mode combinations is the product of each mode
  set's mode count, and every combination is generated in full, so a cap stops
  runaway work. The shipped setup has 12. Each cap throws rather than output a
  partial result: 256 in `design-data/projection.ts` (Analysis and reports) and
  `elevation/output.ts`; 4096 in `color-system/state.ts`,
  `tokens/cascadeExport.ts` and `changelog/tokenComparison.ts`. Do not add new
  caps that throw (see Known debt).
- **Listing combinations: use `modes/combinations.ts`. Never write the loop
  inline.** `modeCombinations(axes)` returns lists of modes, `modeSelections(axes,
  seed?)` returns `{ modeSetId: modeId }` records, and `modeCombinationCount(axes)`
  returns the count. `selectionForModes` builds the id selection that token edit
  keys use, `contextForModes` builds the `{ setKey: modeKey }` context that
  generation uses, and `modesForSelection` goes back from a selection to modes.
  The first mode set varies slowest, and that order is part of the output. Each
  caller still chooses its own mode sets and applies its own cap (above); the
  helpers do not cap. Other shared helpers: `resolveModeParameterValues`,
  `canonicalTokenModeKey`, `parameterOwners`, `capabilityOwners`. The helpers are
  covered by `pnpm test:mode-combinations`, which compares them with the
  previous inline expressions.

## Selection, preview, integrity

- `modeSelectionAtom` (saved) holds `{ modeSetKey: modeId }`. Previews
  (`previewOverridesAtom`) are never saved. Neither changes Changes or Impact,
  which compare mode-set data only.
- Each capability has one owning mode set (first wins). `normalizeModeState` runs
  after every change and silently repairs: it grants ownership when a non-default
  mode overrides a capability, drops claims with no owner, clears selections of
  deleted modes. Edit atoms (`addModeSetAtom`, `replaceModeSetAtom`) throw on
  ownership conflicts.

## Changes and Impact

`modeSets` and `adaptiveClaims` are `CHANGE_DOMAINS`, compared per mode.
`impact/sources/modeFoundation.ts` makes slots per mode and parameter. Mode-value
denominators come from `TokenImpactRecord.modeValues`. Follow `authoring-lifecycle`.

## Platforms (unresolved)

`Mode.platformIds` lists which platforms support a mode. It drives the UI and a
validation check only; no generator reads it. It is not a design-data platform
manifest. Design-data supports platform opt-in, local mode edits, and explicit
platform extensions, and whether the app should align with that is open
(JTC-006, LTAX-005, roadmap INIT-8). Do not extend `platformIds` semantics; ask.
Foundation attachments (`FoundationModeAttachments`) only group mode sets on a
foundation's card; they assign no tokens.

## Known debt and what not to copy

The Modes section of `docs/known-debt.md` lists the open items.
Follow Working rule 5 in `AGENTS.md`: if your task touches one, raise it with the
user. Do not copy these patterns into new code:

- Per-mode structural overrides (color scale stops, contrasts, data-vis sources).
  The model is dials only; do not add similar overrides for any foundation.
- An inline copy of the mode-combination loop. Use `modes/combinations.ts`.
- Silent repairs of user data, and throws on load or on too many modes. Show a
  visible notice and keep the app editable.
- Hardcoded foundation or token-type names for mode handling.

## Checks

`test:modes`, `test:mode-combinations`, `test:mode-integrity`, `test:mode-ui`, `test:changelog`,
`test:impact`. Browser: `tests/e2e/foundation-modes.spec.ts`, `mode-integrity`,
`mode-preview`, `mode-scale-authoring`, `modes`, plus `storybook-foundation-modes`
and `storybook-modes-picker`. Assert no `pageerror` (see `verify-change`).
