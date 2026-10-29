---
name: data-vis
description: How data visualization color scales work in spectrum-studio. Use when touching sequential, diverging or categorical data-vis scales, their points, members, sources or Static and Adaptive modes, categorical suggestions and CVD or Delta E checks, the Elements, Analyze or Code views for data vis, the standalone data-vis adapter bundle (data-vis.js, data-vis.json, build:data-vis), or any file the adapter imports. Covers the three scale kinds, the import-graph rule for the adapter, identity and impact rules, and the checks.
---

# Data vis color scales

Code: `src/features/color-system/data-vis/`, `src/panels/color-system/data-vis/`,
`src/views/color-system/data-vis/`, `vite.data-vis.config.ts`. They are part of the Color
foundation (`color-system` skill; EPIC-1.1 and EPIC-2.1) and tracked as LTAX-010 in the gap
register. Color conversion and formatting rules are in `color-management`. The long reference is
`docs/color-system-data-vis.md`; read it before changing behavior. This skill gives the model,
the traps, and the checks.

## Three scale kinds (`data-vis/model.ts`)

- **Sequential and diverging** are continuous functions, not a fixed number of swatches. Each has
  `points` (`position` 0 to 1). Endpoints stay at 0 and 1; a diverging scale also has an exact
  center at 0.5. A point's source is one of: an owned key color with a contrast target
  (`OwnedPointSource`), a UI color scale (any contrast, such as 2.4:1), or an exact published
  primitive color token (`PrimitiveColorSource`, final value, no second contrast adjustment).
  Duplicate or reordered positions are rejected, not silently moved.
- **Categorical** scales have ordered `members`, each linked to a UI swatch, and `preferences`:
  size (auto or count), minimum background contrast (default 3), minimum Delta E (default 11),
  CVD profiles and style (`balanced` or `bold`). The chooser draws only from final, published UI
  swatches. Each member generates one native color primitive.
- **Static and Adaptive.** Any scale can be Static: it captures its current or default-mode
  authored colors, the adaptive recipe becomes dormant but is retained, and Static categorical
  values are shared across modes. Static never overwrites the retained recipe.

## Interpolation and checks

- Sequential interpolation is bounded piecewise OKLCh on the shorter hue path, with neutral stops
  borrowing the other stop's hue; diverging uses alpha-aware OKLab; neither extends to white or
  black. Out-of-gamut linked points, collapsed colors and nonmonotonic arms are shown as
  diagnostics, never reordered or replaced. Charts own their data and normalization: the function
  clamps values outside 0 to 1 and rejects nonfinite values.
- Categorical suggestions run in a typed worker (`suggestionWorker.ts`, `inspectInWorker.ts`) with
  fixed budgets: 6 starts per style, 32,768 measurements, 200,000 operations, and an 8,192-color
  pool that is rejected, not truncated. Ranking is the versioned `fixed-token-order-1` heuristic,
  not a validated harmony score. A stale async apply must not write members or clear token
  records. A manual failure needs explicit acknowledgment; missing or non-concrete sources cannot
  be waived.
- Keep four meanings separate: normal-vision 3:1 non-text contrast (a WCAG comparison, not a
  chart certification); Delta E 2000 (a distinctness target, not a pass rule); CVD simulation
  (full-severity Machado matrices in linear sRGB, an estimate); and aesthetic scores (estimates).
  None certifies accessibility. Alpha is composited against the actual opaque UI background before
  measuring.

## The adapter bundle: an import-graph rule

`pnpm build:data-vis` builds `data-vis/adapter.ts` into `public/data-vis/data-vis.js`, a pure ESM
runtime (`createDataVisRuntime(packet)`) that the Code view downloads next to `data-vis.json` and
categorical CSS. `vite.data-vis.config.ts` fails the build if the bundle includes React, jotai,
`@react-spectrum`, anything under `src/components|panels|pages|views/`, `src/data/defaults.ts`, or any
module named `state`, `categorical`, `suggestionWorker` or `useSuggestions`.

The adapter imports from `color-system` and `tokens` (`resolution`, `polarity`,
`surfaceGeneration`, `tokens/colorGeneration`, `tokens/model`, `tokens/colorResolution`,
`tokens/paletteGeneration`, and the model files). So **any file the adapter imports, directly or
transitively, must not gain an import of application state, UI, defaults or search code.** A
change that does will pass `tsc` and the dev server and only fail `build:data-vis`. Run it after
editing any such file. The bundle has a 150,000-byte uncompressed budget (enforced in
`tests/data-vis-export.ts`) and embeds the Color.js MIT notice.

The source packet is version 3 (Color schema 5 geometry, output settings, relevant sources, mode
patches, final token edits). Versions 1 and 2 have explicit migrations. Do not change the packet
shape without a migration and a version bump, and do not present a new feature as an old packet.
The adapter and continuous recipes are local extensions with no accepted upstream contract
(`design-data-contract`).

## Identity, tokens and impact

- Each categorical member generates one primitive; its UUID comes from a scale and member tuple,
  independent of label, order or mode. This is the derived-identity scheme (DEBT-017); do not copy
  it for new tokens.
- Continuous functions and hidden points create no primitives and no saved impact counts. Only
  saved categorical inventories and owner-scoped values enter Impact. Previews, suggestions, CVD
  views, aliases and Cartesian samples never create or remove concepts.
- Removing or hiding a source, a swatch, a palette entry or a UI scale that a data-vis input uses
  requires a valid replacement link first. There is no nearest-color, same-index or fixed-hex
  fallback. Removal cleans only the removed records, and scoped Undo keeps later edits
  (`references.ts`, `colorTokenCleanup.ts`).
- A direct member-token edit makes the member manual; an upstream manual UI value does not.
  Categorical token edits in Tokens show "All modes (Static)" when Static.

## Per-mode patches are legacy

Data-vis mode patches (`dataVisSources`, `dataVisContrasts` in a mode's color settings, applied by
`patchDataVisScales`, with "Use this source in all modes" and mode edit destinations) are the
same legacy structural-override mechanism as DEBT-003, and the model is dials only. Do not extend
them or add new mode-patch controls. Clear a mode's data-vis patches before making it the default or
removing its owner, or default-mode normalization will drop them silently. Ask before changing how
they work.

## UI

Elements (small deterministic sample heatmaps and numbered bars; sample data is never saved),
Analyze (lightness, chroma, hue or background-contrast plots; the comparison table has its own
scroll region), Code (downloads), `DataVisPanel`, `CategoricalChooser`, `DataVisPointControls`.
Use existing components (`component-catalog`); the editors use the shared color picker.

## Known debt

Open items are in `docs/known-debt.md`. Follow Working rule 5 in `AGENTS.md`. Relevant: DEBT-003
(mode patches), DEBT-017 (derived UUIDs), and the unconfirmed failing checks.

## Checks

- Narrow: `test:data-vis-editors`, `test:data-vis-interpolation`, `test:sequential-defaults`,
  plus `test:color-output` and `test:color-picker` if shared color helpers changed.
- `test:data-vis` builds the bundle then runs 10 scripts (contracts, generation, interpolation,
  categorical, integration, analysis worker, lifecycle accounting, editors, export, fire
  defaults). It is a tier-4 check: run it once at the end, only when generation, export, the
  adapter or the build config changed.
- Browser: `tests/e2e/data-vis.spec.ts` and `storybook-data-vis.spec.ts`, with `pageerror`
  asserted empty (`verify-change`).
