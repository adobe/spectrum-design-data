---
name: tui-verify
description: >-
  Verifies that the design-data TUI (sdk/tui) renders correctly and behaves as expected
  by driving it with the three-tier verification strategy: (1) deterministic in-process
  buffer assertions, (2) live rmux + asciinema screen capture, and (3) visual asciinema/agg
  or Ghostty + screencapture for pixel-level fidelity. Use when asked to verify, test, or
  confirm the design-data TUI renders or behaves correctly, check TUI layout at a specific
  window size, capture TUI screen contents or screenshots, or assert that a TUI change
  looks right.
license: Apache-2.0
compatibility: >-
  Designed for Claude Code in the spectrum-design-data repo. Tier 1 requires Rust/Cargo
  and the design-data CLI built (cargo build -p design-data-cli). Tier 2 requires rmux
  0.3.x on PATH. Tier 3 (asciinema) requires asciinema 3.x and agg on PATH. Tier 3
  (Ghostty) requires macOS, Ghostty 1.3.0+, Screen Recording TCC permission, and
  GetWindowID on PATH.
---

# TUI verification (3-tier strategy)

The `design-data` TUI (`sdk/tui`) has a purpose-built verification stack. Choose the
**lowest** tier that answers your question — Tier 1 is fastest and most exact, Tier 3 is
the only one that catches visual/glyph issues.

```
Tier 1  render_to_buffer / TestBackend  ← deterministic, no terminal, CI backbone
Tier 2  rmux + capture-pane             ← real binary, live screen text
Tier 3  asciinema + agg / Ghostty       ← pixel image for glyph/colour verification
```

## Prerequisites

* **All tiers**: `cargo build -p design-data-cli --release` (or `moon run :build`) so the
  `design-data` binary is on PATH / in `sdk/target/release/`.
* **Tier 2**: `rmux` 0.3.x on PATH (`brew install rmux`).
* **Tier 3 (asciinema)**: `asciinema` 3.x + `agg` on PATH (`brew install asciinema agg`).
* **Tier 3 (Ghostty)**: Ghostty 1.3.0+, macOS Screen Recording permission granted to the
  controlling terminal, and `GetWindowID` (`brew install smokris/getwindowid/getwindowid`).

***

## 1. Tier 1 — in-process buffer assertions (default)

`render_to_buffer(&mut model, w, h)` builds a ratatui `TestBackend` at an exact size,
draws once, and returns the `Buffer` for cell-level assertions. No terminal emulator.
All 200+ existing tests use this pattern.

**Run the full suite** (always start here):

```bash
cargo test -p design-data-tui        # or: moon run :test
```

**Add a targeted assertion** — follow the patterns in
[`references/tier1-test-api.md`](references/tier1-test-api.md)
(source: `sdk/tui/tests/render.rs`, `sdk/tui/tests/common/mod.rs`):

```rust
use common::{render_to_buffer, make_graph_with_tokens, update_ctx};

#[test]
fn my_new_feature_renders_label() {
    let graph = make_graph_with_tokens(&["accent-color"]);
    let ctx  = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::PaletteSubmit("query property=accent-color".into()), &ctx);
    let buf = render_to_buffer(&mut model, 80, 24);
    // assert specific cell or scan rows:
    assert_eq!(buf.cell((0, 0)).unwrap().symbol(), "▶");
}
```

**Layout at a specific size** — the committed breakpoints are documented in
[`references/tier1-test-api.md`](references/tier1-test-api.md#layout-breakpoints-sdktuitestslayoutrs)
(source: `sdk/tui/tests/layout.rs`):

| Size       | What to check                                                            |
| ---------- | ------------------------------------------------------------------------ |
| `120 × 36` | Spectrum/auto-demo target — logo + all panels visible                    |
| `80 × 24`  | Standard small terminal — no overflow, table readable                    |
| `80 × 33`  | Logo present (content area = 31 rows, the exact threshold)               |
| `80 × 32`  | Logo absent — name/hint/prompt/commands still render (content = 30 rows) |
| `10 × 5`   | Narrow — should not panic                                                |
| `1 × 33`   | Very narrow at logo threshold height — should not panic                  |

***

## 2. Tier 2 — live real binary via rmux (ad-hoc verification)

Use when Tier 1 isn't enough: mouse capture, truecolor Spectrum theme, a real TTY
interaction the in-process harness can't simulate.

**Generic runner — simplest path:**

```bash
bash tools/demo/auto/verify-tui.sh \
  --dataset packages/design-data \
  --steps path/to/steps.txt
```

Step file format (one directive per line):

```
# Comments are ignored
send :
type query property=accent-color
send Enter
wait accent-color
expect accent-color
refute Error
```

Directives: `send KEY` (rmux key name), `type TEXT` (typed with 60 ms animation delay),
`literal TEXT` (send text with no key interpretation, no animation), `wait REGEX` (block
until pattern appears, 120 s timeout), `quiet [N]` (wait until pane stable for N polls),
`expect REGEX` (assert present), `refute REGEX` (assert absent), `capture` (print current
screen to stdout), `sleep N` (sleep N seconds).

The runner prints the pane contents after each `capture` or `expect`/`refute` — read those
to visually confirm layout. Exit code is 0 only when all assertions pass.

**Escape hatch — source `rmux-drive.sh` directly for a custom one-off:**

```bash
source tools/demo/auto/lib/rmux-drive.sh

start_session dd-verify "design-data packages/design-data --theme spectrum --no-resume-wizard"
wait_for dd-verify "commands" 30          # wait for home screen
send_literal dd-verify ":"
type_keys dd-verify "query property=accent-color"
send_keys dd-verify "Enter"
wait_for dd-verify "accent-color"
assert_contains dd-verify "accent-color" "token row present"
capture dd-verify                         # print for agent to read
print_summary verify
end_session dd-verify
```

See [`references/tier2-rmux-api.md`](references/tier2-rmux-api.md) for the full
helper reference (source: `tools/demo/auto/lib/rmux-drive.sh`).

**Moon task** (runs locally, not CI — rmux needs a real PTY):

```bash
moon run demo:tui-verify -- --dataset packages/design-data --steps my-steps.txt
```

***

## 3. Tier 3 — visual / pixel capture

Use only when Tier 1 can't answer the question: glyph widths, wide-char alignment,
Spectrum truecolor swatch colours, box-drawing rendering, font fallback.

**asciinema + agg (deterministic GIF — use this first):**

Record a flow inside the rmux pane (same way `auto-demo.sh` does):

```bash
source tools/demo/auto/lib/rmux-drive.sh
start_session dd-vis
# Inside the pane: wrap the binary in asciinema rec
send_keys dd-vis "asciinema rec /tmp/out.cast --cols 120 --rows 36 --overwrite -- design-data packages/design-data --theme spectrum --no-resume-wizard" Enter
wait_for dd-vis "commands" 30
send_literal dd-vis ":"
type_keys dd-vis "query property=accent-color"
send_keys dd-vis "Enter"
wait_for dd-vis "accent-color" 10
send_keys dd-vis "q"
wait_quiet dd-vis
end_session dd-vis

# Render to GIF — same agg invocation as split-cast.py uses:
agg /tmp/out.cast /tmp/out.gif --cols 120 --rows 36

# Claude can then read the GIF:
# Read tool: /tmp/out.gif
```

**Ghostty + screencapture (real-terminal pixels, macOS only):**

```bash
# 1. Open Ghostty with a pinned cell size (window-width/height are in cells):
osascript -e 'tell application "Ghostty" to activate'
# Or launch from CLI; set window-width = 120, window-height = 36 in Ghostty config.

# 2. Drive input via AppleScript:
osascript <<'EOF'
tell application "Ghostty"
  set t to focused terminal of selected tab of front window
  input text ":query property=accent-color" to t
  send key "return" to t
end tell
EOF

sleep 0.5   # let the frame render

# 3. Capture the window to PNG:
WIN_ID=$(GetWindowID Ghostty "")          # or pass partial title
screencapture -l"$WIN_ID" -o /tmp/tui.png

# Claude reads the image:
# Read tool: /tmp/tui.png
```

**Caveats for Tier 3:**

* `agg` GIF uses its own renderer/font — faithful for layout, not for "does it look exactly
  like Ghostty."
* Ghostty + `screencapture` requires Screen Recording TCC permission on the controlling
  terminal. It is **not deterministic** across machines/DPI/fonts (good on-demand spot
  check, poor committed golden).
* Images support only **fuzzy assertions** ("logo fits", "columns aligned", "swatch is
  indigo") — not cell-exact. Prefer Tier 1 for exactness.

***

## Conventions

* **asciinema, not VHS.** The `tools/demo/videos/` pipeline uses VHS for video manifests
  — do not touch it. The `tools/demo/auto/` pipeline uses asciinema — use that.
* **rmux, not tmux.** The `rmux-drive.sh` library expects `rmux` on PATH.
* The binary takes its terminal size from the real terminal (or rmux pane geometry). To
  test at a fixed size in the real binary, set the rmux pane with `RMUX_COLS`/`RMUX_ROWS`
  in `rmux-drive.sh` (default 120×36). For exact sizes in tests use `TestBackend` (Tier 1).
* `--replay <ndjson>` mode (`sdk/cli/src/main.rs:92`) draws the final buffer and exits
  deterministically — useful for golden-file diffing without a live pane.

## Gotchas

* **Budget**: `tests/budget.rs` enforces an 800-LOC cap on every `src/` file and checks no
  `async` appears in `view*.rs`. New render tests go in `tests/` (no cap there).
* **`Message` size**: every `Message` variant must be ≤ 128 bytes (`tests/budget.rs`).
  Box large payloads.
* **Rmux session names must be unique.** If a previous run left a session alive,
  `start_session` kills it automatically — but check for orphans with `rmux ls` if a test
  behaves oddly.
* **Screen Recording permission** for Ghostty + `screencapture`: System Settings →
  Privacy & Security → Screen Recording → enable the terminal running the script.
