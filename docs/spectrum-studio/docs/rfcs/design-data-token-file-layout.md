<!-- Copyright 2026 Adobe. All rights reserved. -->

# RFC: design-data token file layout (practice copy)

**Status:** Local draft. Not submitted to design-data. Nothing in
`packages/design-data` changes.

## Why

Studio will eventually edit design-data files through the GitHub API. To
practise that now, Studio keeps a **practice copy** of the package at
`data/design-data/`. It has the same data, organized so each token file holds
one tier and one subject. Studio can then rehearse real edits (add a token to
the right file, keep its UUID, re-point an alias) against real files, without
touching the package.

## The rule

Code: `src/features/design-data/tokenFilePlacement.ts`
(`TOKEN_PLACEMENT_RULE_VERSION = 1`).

```text
tokens/primitives/<subject>.tokens.json
tokens/semantic/<subject>.tokens.json
tokens/components/<component>.tokens.json
```

- **Tier** comes from the design-data SDK (`design-data query --filter
tier=…`), which derives the official tier (#1932). Studio never guesses it.
- **One concept, one file.** All rows of a concept (its mode variants) go in
  the file for the concept's highest tier. Adding or removing a mode never moves
  a file.
- **Subject** comes from the token's value type: color, layout, typography,
  opacity or effects. An alias has no type of its own, so the rule follows its
  `$ref` chain to the first token whose type is known. A `$ref` may name a
  token's `uuid` or a concept's `conceptId` (spec `token-format.md`, Concept
  identity); both are followed.
- **Component tokens** go in one file per `name.component` value, or
  `components/unassigned.tokens.json` when there is none.
- **Token text is kept byte for byte.** Moving a token copies its exact JSON
  text; only the surrounding array is rewritten.

Result at commit `e2379a2e`: 2,738 token rows in 13 files (primitive 1,446,
semantic 1,284, component 8). The live package has 8 files grouped by topic.
Because only 8 rows are component tier by the SDK's rule, most tokens from the
live `*-component.tokens.json` files sit under `semantic/` or `primitives/`.

## How the copy is proven

`pnpm data:snapshot` writes the copy and the source record
`data/design-data.source.json` (commit, file hashes, rule version). The
`design-data-snapshot` check rebuilds it in memory and proves:

1. Every file matches what the package and placement rule produce, and every
   token's text appears unchanged, once.
2. `design-data diff` finds no token changes between package and copy.
3. `design-data export` gives the same resolved values in each checked mode
   context. Export order is not stable, so records are matched by `uuid`.
4. The SDK validates the copy (`validate-dataset`).

Once the package moves on, the check reports the changed files as
information and checks only that the copy is still internally consistent.

The Analysis view shows, for information only, whether the package has changed
since the copy was taken. A stale copy never blocks anything.

## Deliberate differences

- `changelog/` is not copied. It is release history generated from git by
  `design-data changelog`; authoring never edits it.
- Only `tokens/` is reorganized. Every other folder keeps the package layout.

## Open questions

1. **Subjects.** Is a value-type subject the right second level, or should
   design-data's own categories (Registry `categories.json`) decide it?
2. **Component-tier scope.** Should tokens that name a component but are
   semantic by the SDK's rule live with that component instead?
3. **Upstream.** Would design-data adopt this layout, or should Studio map
   back to the flat layout when it writes real changes? Studio's tooling works
   with either because the SDK reads nested folders.
