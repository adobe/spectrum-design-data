<!-- Copyright 2026 Adobe. All rights reserved. -->

# `.ai/orchestration/` — orchestrator rules

Copies of the rules the orchestrator gives to agents that work on orchestrated slices. The orchestrator maintains them; edit here only through the orchestrator. See also `.ai/rules/orchestrated-work.md` and `.ai/prompts/`.

| File                 | Used by               | Purpose                                                                                   |
| -------------------- | --------------------- | ----------------------------------------------------------------------------------------- |
| `slice-rules.md`     | orchestrator, authors | Eight standing rules for slice agents (CI, CLI version, PR bodies, worktree hygiene)      |
| `author-rules.md`    | authors               | Standing rules and checklist for local-host authors, including the render-compare harness |
| `reviewer-rubric.md` | reviewers             | Review prompt plus the CI and merge-state check                                           |

## Superseded rules

| Rule                                                  | Now                                                                                                                                |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `slice-rules.md` 4: do not tick the CLA box           | Owner rule 2026-11-22: ALWAYS tick the CLA checkbox; do not leave it unticked or ask                                               |
| `slice-rules.md` 3 and 8: use `gh stack`              | Not used by the orchestrator's briefs: `git fetch` + rebase/merge origin/main, push only your own branch with `--force-with-lease` |
| `author-rules.md`: `design-data-cli@0.63.0` is tagged | Check `git ls-remote --tags origin 'design-data-cli@*'`; do not assume                                                             |

These files are not read by `pnpm ai:sync`, which only handles `.ai/rules` and `.ai/skills`.
