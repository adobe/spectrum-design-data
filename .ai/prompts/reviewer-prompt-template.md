<!-- Copyright 2026 Adobe. All rights reserved. -->

# Reviewer prompt template

Copy, fill the `<...>` fields, and send. Create the reviewer in build mode.

```text
HARD RULES: never call asks_*, never run gh pr merge, never git stash. You are a REVIEWER: do not edit, add or delete anything inside the repo worktree; scratch under mktemp outside the repo.
Read .ai/rules/orchestrated-work.md first and follow its Reviewer section.

PR: <url>, head <sha>
Focus: <risk areas, for example data and engine contracts, render matrix>
Required checks: <option x state matrix size and BASE vs PR method, legacy output diff, recipe_snapshots, mutation checks, budget>
Report: write the FULL report to <report path>, then end with the path, a 5-line summary and `VERDICT: APPROVE` or `VERDICT: CHANGES`.
```
