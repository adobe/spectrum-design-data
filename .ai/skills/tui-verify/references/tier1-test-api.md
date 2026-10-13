# Tier 1 test API reference

Source files in the repo:

* `sdk/tui/tests/common/mod.rs` — test helpers (signatures reproduced below)
* `sdk/tui/tests/render.rs` — existing render tests to follow as patterns
* `sdk/tui/tests/layout.rs` — committed layout breakpoint tests

***

## `render_to_buffer`

```rust
// sdk/tui/tests/common/mod.rs:88
pub fn render_to_buffer(model: &mut Model, w: u16, h: u16) -> Buffer
```

Builds a `ratatui::backend::TestBackend` at exactly `w` columns × `h` rows, draws
once via `design_data_tui::draw`, and returns the `Buffer`. No terminal emulator
involved — entirely deterministic.

**Assert on a specific cell:**

```rust
assert_eq!(buf.cell((x, y)).unwrap().symbol(), "▶");
```

**Scan all rows for a string:**

```rust
fn row_str(buf: &Buffer, y: u16, w: u16) -> String {
    (0..w).map(|x| buf.cell((x, y)).unwrap().symbol().to_string()).collect()
}
fn find_row_containing(buf: &Buffer, needle: &str, w: u16, h: u16) -> String {
    for y in 0..h {
        let row = row_str(buf, y, w);
        if row.contains(needle) { return row; }
    }
    panic!("no row contains '{needle}' in {w}×{h} buffer");
}
```

***

## Other helpers in `common/mod.rs`

```rust
pub const TEST_PRIMER: &str = "test · 0 tokens";

/// Build a KeyEvent (Press, no modifiers).
pub fn key(code: KeyCode) -> KeyEvent

/// Build a MouseEvent at a terminal cell.
pub fn mouse(kind: MouseEventKind, row: u16, col: u16) -> MouseEvent

/// Standard 2-token graph (accent-background-color-default + neutral-background-color-default).
/// Zero-arg convenience — use when you need a non-empty graph but don't care which tokens.
pub fn make_graph() -> TokenGraph

/// Graph with the given token names (value = "red", name.property = name).
pub fn make_graph_with_tokens(names: &[&str]) -> TokenGraph

/// Empty graph — for empty-state and error-path tests.
pub fn empty_graph() -> TokenGraph

/// Minimal UpdateCtx (no fs paths, allow_write = false).
pub fn update_ctx(graph: &TokenGraph) -> UpdateCtx<'_>
```

***

## Typical test skeleton

```rust
mod common;
use common::{key, make_graph_with_tokens, render_to_buffer, update_ctx, TEST_PRIMER};
use crossterm::event::KeyCode;
use design_data_tui::{update, Message, Model};
use ratatui::buffer::Buffer;

const W: u16 = 80;
const H: u16 = 24;

#[test]
fn my_feature_renders_correctly() {
    let graph = make_graph_with_tokens(&["accent-color"]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::PaletteSubmit("query property=accent-color".into()), &ctx);
    let buf = render_to_buffer(&mut model, W, H);
    find_row_containing(&buf, "accent-color", W, H);
}
```

***

## Layout breakpoints (`sdk/tui/tests/layout.rs`)

| Terminal size | Content rows | Logo shown? | Notes                                               |
| ------------- | ------------ | ----------- | --------------------------------------------------- |
| 120 × 36      | 34           | ✅           | Spectrum/auto-demo target                           |
| 80 × 33       | 31           | ✅           | Exact logo threshold                                |
| 80 × 32       | 30           | ❌           | One below threshold                                 |
| 80 × 24       | 22           | ❌           | Standard small terminal                             |
| 10 × 5        | 3            | ❌           | Narrow — panic safety                               |
| 1 × 33        | 31           | ✅           | Very narrow at logo threshold height — panic safety |

Content rows = terminal\_height − 2 (primer header row + palette prompt row).
Logo threshold: content rows ≥ 31 (17 logo lines + 1 + 13 non-logo lines, from `src/view.rs`).

***

## Constraints

* `tests/budget.rs` enforces 800-LOC cap on every `src/*.rs` file — new tests go in
  `tests/` where there is no cap.
* Every `Message` variant must be ≤ 128 bytes; box large payloads.
* `src/view*.rs` must not contain `async fn` or `tokio::` — enforced by `budget.rs`.
