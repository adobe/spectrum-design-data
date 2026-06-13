---
"@adobe/design-data-tui": minor
---

Upgrade command palette to fuzzy subsequence matching with matched-char highlights.

- **sdk/core/src/query.rs** (`subsequence_match`): new sibling of `subsequence_score`
  returning matched character indices alongside the score; `subsequence_score` now
  delegates to it.
- **sdk/tui/src/command.rs** (`CommandMatch`, `Command::matches`): fuzzy-ranked candidate
  list sorted best-score-first; `Command::filter` rewritten as a thin wrapper so all
  callers (Tab/Enter completion, `update.rs`) continue to work unchanged.
- **sdk/tui/src/view/home.rs** (`render_home`): switches to `Command::matches` and renders
  each candidate name as per-character spans, underling matched positions for unselected
  rows and applying bold accent for the selected/top-hint row.
