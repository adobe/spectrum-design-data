---
"@adobe/design-data-tui": minor
---

Wire write_token into the TUI wizard (M4 of RFC #973): Screen 4 Submit writes a token
file and updates product-context.json when --allow-write is passed.

- **sdk/tui/src/main.rs**: `--allow-write` CLI flag threaded into wizard via `WizardCtx`.
- **sdk/tui/src/wizard.rs**: target-file resolution, `$schema` inference, UUID generation,
  `perform_write` method; `advance_to_confirm` now takes full `WizardCtx`.
- **sdk/tui/src/app.rs**: Submit handler calls `ws.perform_write(ctx)` when allowed;
  errors surface on Screen 4 without closing the modal.
- **sdk/tui/Cargo.toml**: add `uuid` dep for v4 UUID generation on new tokens.
- **sdk/tui/tests/write.rs**: 6 hermetic tests covering write, no-write, missing schema.
- Without `--allow-write`, behavior matches M3 (preview only; no disk writes).
