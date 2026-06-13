---
"@adobe/design-data-tui": minor
---

Add auto-dismissing toast overlay and consolidate modal popup boilerplate.

- **sdk/tui/Cargo.toml**: add `tui-popup = "0.7"`.
- **sdk/tui/src/model/views.rs** (`Toast`): new type reusing `StatusKind` for
  severity; auto-dismissed by a subscription timer, not the persistent status line.
- **sdk/tui/src/model.rs** (`toast`, `set_toast`, `clear_toast`, `toast()`): toast
  field and accessors alongside the existing `status_message`.
- **sdk/tui/src/message.rs** (`ToastExpired`): unit variant emitted when the toast
  timer fires; clears the model toast in `update`.
- **sdk/tui/src/subscription.rs** (`TOAST_DURATION`, `subscriptions`): 3 s duration
  const; `Named("toast")` interval gated on `model.toast().is_some()` — starts and
  stops automatically via `Subscriptions::diff`.
- **sdk/tui/src/update.rs**: handle `ToastExpired`; `ClipboardDone(None)` now
  shows a "✓ copied" toast instead of silently succeeding.
- **sdk/tui/src/view.rs** (`modal_frame`): shared helper replaces duplicated
  `centered_rect + Clear` across all four modals; toast rendered via `tui-popup`
  `Popup` in the right half of the active view; Help border uses `border::ROUNDED`.
