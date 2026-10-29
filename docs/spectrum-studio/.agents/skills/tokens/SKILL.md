---
name: tokens
description: How tokens work in spectrum-studio. Use when touching the Tokens page or token browser, token generation sources, token identity or naming, per-mode token edits or overrides, stale edits, semantic tokens, compatibility aliases, cascade or design-data token export, or when a new foundation or token type needs to appear as tokens. Covers where token values and names come from, the two edit layers, what is editable, and known debt not to copy.
---

# Tokens

Code: `src/features/tokens/`. UI: `src/pages/Tokens.tsx`, `src/views/tokens/` (`TokenBrowserView`),
`src/panels/tokens/` (`TokenDetailsDialog`), `src/features/tokens/view/` (table models and the
panel registry). Roadmap: INIT-4 (EPIC-4.2 semantic tokens, EPIC-4.4 semantic layer in Tokens)
and EPIC-8.3 (the Tokens Code view is still "Coming soon"). Mode keys, mode combinations and
per-mode meaning are in the `modes` skill. The persistence, Changes and Impact checklist is in
`authoring-lifecycle`. This skill describes the code as it is; known debt is listed at the end.

## Tokens are generated, never authored

Foundations generate token values. A token has no value of its own to type in; the user can only
override one (see Edits).

- **Primitive tokens.** `browserTokenSourcesAtom` (`browserState.ts`) assembles
  `BrowserTokenSource[]` from: color, typography, spacing, size and radius
  (`browserSources.ts`, `browserSourcesFromOutputs`), elevation (`browserElevationSources` in
  `elevation/output.ts`), and categorical data-vis colors (`generatedCategoricalSourcesAtom`).
- **Semantic tokens.** Tokens that alias primitives or carry taxonomy terms. They are not tied to
  one generator. Today the only generator is Structures, through the t-shirt artifacts
  (`semanticBrowserState.ts`); other ways of generating semantic tokens are expected. Write code
  against "a semantic token" (`BrowserToken.semantic`), not against Structures. Their generation
  belongs to the structures skill. Intended model: a user can override a semantic token's output
  value per mode, exactly like a primitive's (see Edits). Today the code blocks that (DEBT-016).
- **Compatibility aliases** (`aliases.ts`, `aliasState.ts`). A saved name with a `$ref` to a
  canonical token and the mode contexts it applies to. Generation never creates them: a save
  captures a token's previous name once, so old names keep resolving. An alias has no value or
  metadata of its own and cannot be edited.
- Semantic tokens are appended after primitives and are not resolved against edits today.
- `browserTokensAtom` resolves sources against edits for the active mode key
  (`resolveBrowserTokens`), then projects names through the taxonomy
  (`projectBrowserTokens`), then appends semantic tokens and aliases.

## Identity and names

- **Current implementation, not the target.** `tokenUuid(stableKey)` (`model.ts`) derives an id
  from the source (`scaleId:contrastId` for color), and other types build ids from their parts
  (`${domain}-${scaleId}-${step}`, `typography-${group}-${scale}`; semantic tokens use their
  concept id). This derived approach is known to be wrong. design-data identifies tokens with
  random UUIDs. Follow the design-data project's guidelines for UUID compliance for any new
  token identity, and do not copy or extend the derived scheme (DEBT-017). Edits are keyed by
  these ids today, so changing identity touches edits, aliases, Changes and exports; ask first.
- Names are not typed. A token's name is the taxonomy projection of its classification, so a name
  patch throws ("Use registered category and term selections"). Governed sources (foundation
  controlled) cannot be reclassified. Problems appear as `projection.issues` on the token (an
  unresolved classification, or a serialized-name collision), not as thrown errors. Follow
  `design-data-contract` for anything that changes names or the taxonomy.

## Edits: two layers

- **Per-mode browser edits** (`browserTokenEditsAtom`, key `tokens/browser/edits`,
  `browserEdits.ts`, types in `browserEditTypes.ts`). Per token: `description`, `status`
  (`draft` or `deprecated`; released cannot be set locally), name fields, and `values`, keyed by
  `canonicalTokenModeKey`, each `{ value, baseline }`. These apply to every token type that the
  edit code accepts (see exclusions). A per-mode value edit is a static override that bypasses
  the formula; the product intent is that these are allowed, never blocked, flagged in the UI,
  and counted toward future systematicity metrics (see the `modes` skill). The edits are pending:
  they are meant to be committed to the design-data repository and leave `browserEdits`
  (INIT-10); do not treat the atom as a permanent home.
- **Legacy color overrides** (`tokenOverridesAtom`, key `tokens/color/overrides`,
  `overrides.ts`). A color-only layer with name and value, not per mode. It surfaces on a
  source as `legacyOverridden` and `legacyStale`. It is legacy and to be retired into per-mode
  browser edits. Do not add to it and do not copy its shape (`TokenName` with `colorName` and
  `contrastValue`).
- **Stale.** An edit stores the generated value it was made against (`baseline`). If generation
  later changes, the edit still wins and the token is flagged `stale`. Nothing discards it
  silently. Reset actions remove edits explicitly (`resetBrowserTokenAtom` for browser edits;
  `resetTokenAtom`, `resetAllTokenOverridesAtom` and `resetStaleTokenOverridesAtom` in
  `tokens/state.ts` for the legacy layer).
- **Write-through.** Palette tokens write their value to the palette color. Static categorical
  data-vis tokens write to the color document and are not stored as per-mode values.
- **Blocked today:** aliases (they have no value of their own), elevation tokens (edit complete
  shadows in the Elevation foundation), and semantic tokens. The semantic block is not the
  intended model: semantic tokens should take per-mode value overrides like primitives
  (DEBT-016). Do not extend the block to new semantic generators, and ask before changing it.
  Bulk edits are rejected for mixed types or units, released tokens, and several palette
  colors at once.
- **Preconditions** (`editBrowserTokensAtom`): edit mode on, a saved mode selection (no active
  preview), and the dialog's mode key still equal to the current one.

## Export and downstream

- `cascadeExport.ts` builds the design-data cascade rows: default modes omitted, explicit rows
  per owned mode combination.
- Other generated outputs live in `design-data/`: `dimensionArtifacts`, `shadowArtifacts`,
  `tshirtArtifacts`. Treat their schemas and pinned evidence as in `design-data-contract`.
- Changes and Impact read `savedBrowserTokensAtom` and `TokenImpactRecord`s; component impact
  reads `componentTokenCatalog`. Use the `authoring-lifecycle` checklist.

## UI

- `TokenBrowserView` lists cards and tables; `TokenDetailsDialog` edits one or several tokens.
  Use the existing field, preview and dialog components (`component-catalog`).
- `view/tokenPanelRegistry.ts` defines a panel per `TokenPanelId`. Only Colors has a real
  definition; the others use `placeholderDefinition`, and `canEditPrimitive` is not read anywhere
  outside the registry. Do not rely on it to decide what is editable.

## Adding a token source or type

Extend the `TokenPanelId` union and the registry, add the source in `browserSources.ts` (or a
sibling like elevation), feed `savedSources` in `browserSavedState.ts` and the `TokenImpactRecord`
feed, give it taxonomy governance (`taxonomy/*Governance.ts`), and, if the values vary by mode,
the per-mode path in the `modes` skill. Ask the user before adding new UI.

## Known debt

Open items are in the Tokens section of `docs/known-debt.md`. Follow Working rule 5 in
`AGENTS.md`: if your task touches one, raise it. Do not copy: the legacy color override layer,
thrown errors for naming or classification problems (use `projection.issues`), and
registry flags that nothing reads.

## Checks

`test:tokens`, `test:token-aliases`, `test:value-preview`, `test:primitive-references`;
`test:changelog` and `test:impact` when saved or compared token data changes. Browser:
`tests/e2e/tokens.spec.ts`, `token-preview-controls.spec.ts`, `storybook-token-browser.spec.ts`,
with `pageerror` asserted empty (see `verify-change`).
