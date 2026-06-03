---
"@adobe/design-data": minor
---
Upgrade Ratatui ecosystem to unlock new widget crates for UX improvements.

- **sdk/tui/Cargo.toml**: bump `ratatui` 0.28→0.30, `crossterm` 0.28→0.29,
  `tui-input` 0.10→0.15.
- **sdk/rust-toolchain.toml**: bump Rust toolchain 1.85→1.88
  (required by ratatui 0.30 MSRV).
- **.github/workflows/release.yml**: update hardcoded toolchain pin to 1.88.0.
- **sdk/tui/src/view.rs**, **view_find.rs**: rename `highlight_style` →
  `row_highlight_style` (ratatui 0.30 breaking change, 5 sites).
- **sdk/tui/src/runtime.rs**: use `map_err` for `terminal.draw()` calls
  (ratatui 0.30: `Backend::Error` no longer implies `Send+Sync`).
