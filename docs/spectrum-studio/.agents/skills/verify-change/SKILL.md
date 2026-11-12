---
name: verify-change
description: Select bounded Studio checks from the executable inventory. Use before tests, lint, builds, browser checks or performance commands, and when finishing a feature.
---

<!-- Copyright 2026 Adobe. All rights reserved. -->

# Verify a change

Prove the requested behavior with the smallest covering selection. Do not turn
verification into another feature or a whole-domain investigation.

## Select checks

1. State what changed, which check IDs cover it and why.
2. Inspect `pnpm check:list --only <id,...>`. IDs, declared scope/resource class
   and prerequisites come from `scripts/checkInventory.ts`. A filename is not
   proof of small work: full catalogs and broad fixtures are integration checks.
   Do not expand grouped aliases or invent a second test map.
3. Run exact element-level IDs with `pnpm check:focused --only <id,...>`.
   Small jobs reserve 256 MiB and have a 30-second whole-selection deadline.
   At most two may overlap; never start extra commands outside admission.
4. For changed types, inspect `types-files --files <file,...>` or `runner-types`;
   for lint, inspect `lint-files --files <file,...>`. These follow actual imports
   but do not append every tooling root. They are conservatively heavy.
   Do not automatically add `app-types`, `tooling-types` or `test-types-*`.
5. Add lifecycle/Changes checks only when persisted behavior changes. Integration
   or project scope needs an explicit user request and `--scope-approved`.
   Named heavy checks need explicit approval and `--heavy-approved`; they run
   alone, with 1 GiB and a 60-second selection deadline. Profiles and flags record
   approval, not grant it. Existing comprehensive CI coverage is unchanged.

The runner owns deadlines, shared admission, process accounting, output limits
and stopping. See [the execution contract](../../../docs/agent-execution.md).
Its cutoffs are provisional safety limits, not performance baselines.

## Browser checks

- Run only after the relevant major feature is complete, or after separate
  approval. UI changes do not automatically require a browser.
- Prefer existing isolated Storybook checks for input, focus, keyboard, menus
  and layout. Inspect IDs with `pnpm check:list --profile browser`.
- Select a file with
  `pnpm check:focused --profile browser --only browser-storybook-<name>`.
  The configurations enforce one worker, zero retries and bounded execution.
- Before any actual app-page check, ask for explicit permission. Explain what
  integration a story cannot prove and name the scenario. Add `--app-approved`
  only after receiving that permission; the flag records approval, not grants it.
- Collect page errors and assert user-visible behavior. Screenshots alone do
  not prove interaction correctness. Do not add a viewport/page matrix without
  a requirement. Report skipped evidence plainly.

## Stop instead of expanding

- Busy returns "not run" immediately. Continue independent work; do not wait,
  poll or retry. A resource cutoff, timeout, cancellation or incomplete cleanup blocks later
  work. Report the reason and ask before retrying or increasing scope/limits.
- Do not launch another job, background agent, duplicate server or repository
  copy to get around a blocked run.
- A failing check does not authorize an unrelated fix or expensive baseline.
  Separate task regressions from existing/unconfirmed failures. Never change
  pins, snapshots or assertions just to obtain a pass.
- Do not repeat a passing check unless its relevant source, configuration,
  data or toolchain changed. Results are not cached by command name.
- Search only Studio/source packages, excluding dependencies, caches, generated
  output and reports. Default to one scoped search and direct agent work.
- Keep the requested outcome and non-goals in view. New debt is a finding, not
  an instruction to create more implementation tasks.

## Handoff

State the outcome, exact selected commands and results, remaining evidence gaps,
and any intentionally running task-owned process. Do not equate tool launch
success with a passing check, a type check with browser correctness, or moving
work to a worker with bounded memory. Ask about a local commit as required by
`AGENTS.md`; never push automatically.
