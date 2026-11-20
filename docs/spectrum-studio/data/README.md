<!-- Copyright 2026 Adobe. All rights reserved. -->

# Studio data

The files Studio reads as its starting data, kept outside `src/` so they can
be organized and edited like the design-data repository they will one day
write to.

| Folder                    | What it holds                                                                                                       | Edited by                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `studio/`                 | Studio's shipped defaults: foundations (color scales and other generator inputs), formulas, modes, taxonomy, rules. | People and Studio. One subject per file.     |
| `design-data/`            | The practice copy of `packages/design-data`, with tokens organized by tier and subject.                             | Only `pnpm data:snapshot`. Do not hand-edit. |
| `design-data.source.json` | Which design-data commit the practice copy came from, with file hashes.                                             | Only `pnpm data:snapshot`.                   |

## studio/

Each file is one part of the authored design system; `studio/studio.json`
lists them. Studio loads them through `src/data/studioData.ts`. After editing
a file, run `pnpm data:studio` to normalize it and refresh the generated
index (`src/data/studioData.generated.ts`). The `studio-data` check fails if
that step was skipped.

Foundation files hold the inputs that generate tokens (for example, color
scale parameters). Generated tokens are not stored here; they are compared
with, and will eventually be written to, the token files in `design-data/`.

## design-data/

A frozen, validated copy of `packages/design-data` at the commit in
`design-data.source.json`. It differs from the package in two ways:

- Token files are organized as `tokens/<tier>/<subject>.tokens.json` and
  `tokens/components/<component>.tokens.json`. Each token keeps its exact
  text. See [the layout RFC](../docs/rfcs/design-data-token-file-layout.md).
- `changelog/` is left out because it is generated from git history.

Run `pnpm data:snapshot` to refresh it after design-data changes. The
`design-data-snapshot` check proves the copy holds the same tokens and
resolved values as the package. The Analysis view says when a refresh is
available; it is information only.
