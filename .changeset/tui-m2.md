---
"@adobe/design-data-tui": minor
---

Add `:resolve`, `:describe`, `:validate` views + palette autocomplete — M2 of RFC #973.

- **sdk/tui/src/app.rs**: three new `ActiveView` variants (`Resolve`, `Describe`,
  `Validate`); `submit_palette` extended with matching dispatch arms; Tab autocomplete
  completes the leading command word in Command mode.
- **sdk/tui/src/main.rs**: `DatasetHandle` loads components + mode sets at startup;
  `--components` / `--mode-sets` CLI flags added; three new render branches in the
  draw loop; `submit_palette` receives full `SubmitContext`.
- **sdk/tui/tests/**: `autocomplete.rs`, `resolve.rs`, `describe.rs`, `validate.rs`
  added (42 new tests, 52 total).
