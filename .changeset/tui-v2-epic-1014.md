---
"@adobe/design-data": minor
---

Finish the TUI v2 architecture epic (closes #1014, closes #1022).

- **sdk/tui/update_command**: `describe`/`validate` FS work now dispatches via `Task::Cmd` and
  completes through `DescribeDone`/`ValidateDone`, removing the last inline I/O from `update`.
- **sdk/tui/update**: the `--allow-write` wizard write runs in a `Task::Cmd` reporting via
  `WriteDone`; `UpdateCtx::schema_registry` is now an `Arc` so closures stay `Send + 'static`.
- **sdk/tui/subscription**: new identity-keyed `Subscription`/`Subscriptions` (#1022); the
  periodic `Tick` is a diffed subscription instead of a hard-coded poll timeout.
- **sdk/tui/app**: retire the legacy `App` state machine — `Model` + `update` is the sole
  source of truth; `app.rs` keeps only shared view-type re-exports and palette helpers.
