---
"@adobe/design-data-tui": minor
---

Fix Enter-key overload in find wizard: add Preview button as last Tab stop.

- **sdk/tui/src/find.rs**: add `PREVIEW_FOCUS`/`FOCUS_COUNT` consts; Tab/BackTab cycle over
  all 6 focusables; rewrite Enter so it accepts a suggestion on fields and only advances to
  Preview when the Preview button is focused; add live `preview_count` refresh on every
  keystroke so the button label stays current.
- **sdk/tui/src/view/find.rs**: render a bordered "▶ Preview N token(s) →" button as the
  last element of the Filters layout (highlighted with accent color when focused); remove the
  standalone match-count row; correct the footer hint.
