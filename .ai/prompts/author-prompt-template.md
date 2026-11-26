<!-- Copyright 2026 Adobe. All rights reserved. -->

# Author prompt template

Copy, fill the `<...>` fields, and send. Keep the rules in `.ai/rules/orchestrated-work.md`, not in the prompt. Remote hosts need the repo checked out at a ref that contains that file.

```text
HARD RULES: never call asks_*, never run gh pr merge, never git stash. You are an AUTHOR in your own worktree only.
Read .ai/rules/orchestrated-work.md first and follow it.

Goal: <what to build, one paragraph; paste decisions already made, not "as discussed">
Bead: <id, or none on a remote host>
In scope: <files or areas>
Out of scope: <files or areas>
Constraints: <contracts, budgets, version expectations (for example Cargo is untagged-ahead: no bump)>
Gates: <commands and matrices that must pass for this change type>
PR: title `<type(scope): description>`, base main, every template section filled.
Report: write the FULL report to <report path>, then end with the path and a 5-line summary.
```
