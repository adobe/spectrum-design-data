---
name: design-data-contract
description: How spectrum-studio relates to the external design-data (spectrum-design-data) reference repo. Use when a change adds or alters taxonomy, tokens, modes, schema, token names, export or output shapes, mappings, or anything that might differ from design-data; when editing the gap register (src/data/design-data-gaps.json); when touching the Analysis page; or when asked about alignment, parity, upstream proposals, or "audit". Covers the four data buckets, the register, commands, pinned evidence, and what must never block the app.
---

# Design-data contract

This app will eventually reach full parity with design-data and move into a
`packages/` subfolder of that repo. Until then it introduces new data and
possible schema enhancements. **Differences are information, never failures**
(AGENTS.md, Working rule 2): the app must start, load, render, and stay editable
whatever the divergence, and a difference is shown with a path to fix it.

## The four buckets

Classify every new or changed data point.

| Bucket | Meaning | Action |
| --- | --- | --- |
| **New** | In the app, not in design-data | Upstream candidate. Never a blocker. Link or add a gap entry (`direction: app-to-reference`, usually `rfc.status: needed`) |
| **Missing** | In design-data, not yet in the app | A delta to close. Gap entry with `direction: reference-to-app` |
| **Inconsistent** | In both, and they differ | Fix it, or record it as an intentional policy (`kind: intentional-policy`, `disposition: intentional difference`) |
| **Aligned** | Matches | Nothing to do |

The code does not use these four labels yet. Nearest equivalents in
`src/features/design-data/comparison.ts`: New = `app-only` / `extension`;
Missing = `reference-only`, `field-gap`, `type-gap`, `mode-gap`, `platform-gap`;
Inconsistent = `value-difference`, `structure-difference`; Aligned = `equal`.
"Aligned" also means different things in coverage (represented) and in the gap
`disposition`. Do not mix them. The Analysis page does not present the four
buckets and has no per-finding link to a gap ID; that redesign is a separate,
roadmap-governed task (INIT-7, INIT-11).

## The gap register

`src/data/design-data-gaps.json` is the source of truth for alignment status.
Schema and checks: `src/features/design-data/gaps.ts`. Never edit
`docs/design-data-gap-register.md` by hand; regenerate it with `pnpm gaps:docs`.

| Field | Values and meaning |
| --- | --- |
| `id` | `LTAX-nnn`, unique, stable. Next free ID: LTAX-017 (check the file) |
| `kind` | `app-capability`, `spec-schema`, `sdk`, `token-content`, `intentional-policy`, `unassessable` |
| `direction` | `app-to-reference`, `reference-to-app`, `joint` |
| `owner` | `leonardo`, `upstream`, `joint` |
| `profile`, `revision` | `reference-checkout` and the 40-character reference commit the entry was reviewed against |
| `implementation` | `open`, `in progress`, `implemented`, `verified`, `blocked`: local build state only |
| `disposition` | `not assessed`, `partial`, `aligned`, `intentional difference`: declared alignment |
| `rfc.status` | `not required`, `needed`, `drafted`, `submitted`, `accepted`, `rejected`; optional `link` |
| `criteria[]` | Acceptance checks (`manual`, `mapped-records`, `value-parity`) with local `docs/`, `tests/` or `src/` evidence paths |
| `history[]`, `blockers[]`, `links[]`, `expected[]`, `scope` | Dated audit trail, open blockers, linked finding IDs (JTC-*, PR1454-*, GAP-001..009), mapped record pairs, bounded scope |

Keep implementation, alignment, and RFC state separate. Local tests, product
approval, upstream alignment, RFC acceptance, and manual architecture review are
five different facts. Never mark a gap `aligned` because local tests pass. The
register is invalid if `aligned` has blockers, unreviewed manual criteria, or an
RFC that is not `not required` or `accepted`. Missing or stale reference evidence
stays `unassessable`. A zero denominator is not a pass.

To add an entry: take the next ID, set `profile` and `revision`, choose `kind`,
`direction`, `owner`, start with `implementation: open`,
`disposition: not assessed`, an `rfc.status`, at least one criterion, and only
existing link IDs and local evidence paths. Then run `pnpm gaps:docs` and
`pnpm test:design-data-gaps`. Ask the user before adding or changing entries
beyond what the task requires.

## Commands

| Command | Purpose | Needs reference checkout | Can fail |
| --- | --- | --- | --- |
| `pnpm check:design-data-gaps` | Validate the register and confirm the generated doc is current | No | Yes |
| `pnpm gaps:docs` | Regenerate `docs/design-data-gap-register.md` | No | If the register is invalid |
| `pnpm test:design-data-gaps` | Register tests | No | Yes |
| `pnpm test:design-data`, `test:design-data-assessment`, `test:design-data-coverage`, `test:design-data-materialization`, `test:design-data-portable-contract` | Comparison, pins, coverage, output boundaries | No (fixtures) | Yes |
| `pnpm test:design-data-sdk` | Runs the reference SDK | Yes, plus a built SDK binary | Yes |
| `pnpm analyze:design-data` | Writes `reports/design-data/report.{json,md}` | Yes | Exit code 1 on `invalid-input` findings |

Run the reference commands only when the user asks. See `verify-change`.

The reference path comes from `DESIGN_DATA_PATH` in `.env.local` (default
`../spectrum-design-data`). If it is absent, the app still starts; Analysis
shows an unavailable state, coverage is not shown as 0%, and gap freshness is
`unavailable`.

## Pinned evidence: do not edit

- `docs/design-data-target-contract.md` and `docs/design-data-pr-1454-review.md`
  are SHA-256 pins in `src/features/design-data/assessmentPins.ts`. Editing
  them marks findings stale. Several app source files are pinned too
  (`comparison.ts`, `projection.ts`, `modes/model.ts`, `color-system/model.ts`,
  `scales/scaleType.ts`, `logic/model.ts`, `tokens/browserModel.ts`,
  `design-data/model.ts`, `platforms/model.ts`): editing them makes related
  findings stale until a human re-review.
- Never refresh a pin from a report run or to make a check pass. A pin update is
  a deliberate review act: re-read the source, confirm the statement in
  `assessmentRegistry.ts` still holds, hash it, edit `assessmentPins.ts`, run
  `pnpm test:design-data-assessment`. Needs the user's explicit approval.
- Do not refresh historic output or reference pins, or close a gap, because
  Changes tests pass.

## Canonical docs

Index: `docs/README.md`. Do not load `docs/archive/`.

- `docs/design-data-target-contract.md`: the joint future contract and where
  the two sides differ. Treat it as a proposal; do not implement a target
  authoring model, schema, or migration from it. Primary roadmap fit: EPIC-7.1,
  EPIC-7.3.
- `docs/design-data-authoring-storage-contract.md`: how authored data is
  stored, persisted, validated, and generated. Preserve existing IDs; keep
  authoring artifacts separate from token output; failures must preserve work.
  Decisions D-03 to D-05, D-07, D-08 were unresolved when last read.
- `docs/design-data-coverage-metrics.md`: what Analysis percentages mean.
  Missing app data, not-matched-yet, and value agreement are different things.
  No reference records means no percentage; explain why instead of showing 0%.
- `docs/rfcs/*`: proposals for design-data, not yet submitted.

## Never block

- Do not add `throw` or `assert*` at module load or on stored or authored data
  for reference differences. Reference-derived checks go in `tests/` and
  `scripts/`.
- Known existing load-time checks (do not copy for reference differences):
  `src/data/defaults.ts` and `src/features/taxonomy/standardContract.ts` assert
  the app's own shipped data (duplicate IDs, ownership); they do not read the
  reference. `src/features/edit-session/storage.ts` blocks saving after a failed
  restore on purpose, to protect the stored record; do not change it without the
  user's approval. `src/features/design-data/gaps.ts` no longer throws on an
  invalid register: it exports `gapRegisterLoadIssues` and logs them, while
  `pnpm check:design-data-gaps` still fails.
  `standardContract.ts` carries a reference revision field: do not add checks
  that compare it with the reference at load.
- Do not add design-data alignment gates to `pnpm lint` or `pnpm build`. Those
  belong to the parent repo later.
- Do not use `disabled` controls or blank views to signal divergence. Show an
  issue with what, where, severity, and a suggested fix.
- Do not turn "not matched yet" into "missing".
