---
"@adobe/design-data-tui": minor
---

tui: five UX improvements from conventions review.

- **update.rs / help.rs**: `?` now opens a wizard-context help overlay from inside any
  wizard or modal; new `HelpContext::Wizard` variant promotes the WIZARD section (F1).
- **find.rs / naming.rs**: Esc goes back one screen (S2→S1, S3→S2) instead of
  hard-cancelling from any screen — matching the authoring wizard's behavior (F2).
- **update/command.rs**: Invalid palette commands show a did-you-mean suggestion using
  the existing fuzzy ranker, e.g. `unknown command: descrbe — did you mean \`describe\`?` (F3).
- **view.rs**: A persistent `[SEL]` badge appears in the status line whenever mouse
  text-selection mode is active, so users know the mode is on after other messages appear (F4).
- **wizard.rs**: Ctrl-A/E/W/U readline editing works in authoring wizard text fields;
  the Ctrl early-return was narrowed to intercept only Ctrl-S on Screen 4 (F5).
