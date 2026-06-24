---
"@adobe/design-data-tui": minor
---

Add cascade lifecycle ops and wire token creation to cascade format
(Phase B / B2, closes #1192).

- **sdk/core/src/authoring/lifecycle.rs**: new module with five lifecycle
  mutation ops against `*.tokens.json` cascade arrays — `edit_token`,
  `deprecate_token`, `rename_token`, `rewire_alias`, and `remove_token` —
  enforcing UUID stability, cross-field deprecation rules, and
  ref-resolution guards on alias-rewire and remove.
- **sdk/core/src/authoring/session.rs**: `commit_session` now writes via
  `write_cascade_token`; new tokens are stamped with `introduced` at the
  active dataset spec version (`authoring-workflow.md` L71).
