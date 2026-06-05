// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Render snapshot tests using `insta`.
//!
//! These tests capture the terminal buffer rendered by `view::draw` and compare
//! it against a committed `.snap` file. A failure means the rendered output
//! changed — run `cargo insta review` (or `INSTA_UPDATE=always cargo test`) to
//! review and accept changes.
//!
//! Why snapshots here instead of hand-written cell assertions?
//! - Easier to review: you see the *whole* rendered widget, not individual cells.
//! - Self-documenting: snap files commit alongside code, so regressions are
//!   visible in diff.
//! - Easier to update: one `cargo insta review` session vs. hunting every assert.
//!
//! These tests use an 80×24 `TestBackend` (the canonical "terminal window").

mod common;
use common::{make_graph_with_tokens, render_to_buffer, update_ctx};

use design_data_tui::{update, Message, Model};
use ratatui::buffer::Buffer;

/// Stringify a ratatui [`Buffer`] into a trimmed multi-line string for `insta::assert_snapshot!`.
fn buffer_to_string(buf: &Buffer) -> String {
    let area = buf.area();
    (0..area.height)
        .map(|row| {
            let line: String = (0..area.width)
                .map(|col| buf.cell((col, row)).map(|c| c.symbol()).unwrap_or(" "))
                .collect();
            line.trim_end().to_string()
        })
        .collect::<Vec<_>>()
        .join("\n")
}

// ── Home / empty view ─────────────────────────────────────────────────────────

/// The initial home screen (no query, no modal).
#[test]
fn snapshot_home_view() {
    let mut model = Model::new();
    let buf = render_to_buffer(&mut model, 80, 24);
    let rendered = buffer_to_string(&buf);
    insta::assert_snapshot!("home_view_80x24", rendered);
}

// ── Query results view ────────────────────────────────────────────────────────

/// A query view with a few matching tokens.
#[test]
fn snapshot_query_view() {
    let graph = make_graph_with_tokens(&[
        "accent-background-color-default",
        "neutral-background-color-default",
        "positive-background-color-default",
    ]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(
        &mut model,
        Message::PaletteSubmit("query property=*".into()),
        &ctx,
    );
    let buf = render_to_buffer(&mut model, 80, 24);
    let rendered = buffer_to_string(&buf);
    insta::assert_snapshot!("query_view_80x24", rendered);
}

// ── Palette open ─────────────────────────────────────────────────────────────

/// The palette in its initial open state (empty input).
#[test]
fn snapshot_palette_open() {
    let graph = make_graph_with_tokens(&["accent-background-color-default"]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(
        &mut model,
        Message::Key(crossterm::event::KeyEvent {
            code: crossterm::event::KeyCode::Char(':'),
            modifiers: crossterm::event::KeyModifiers::NONE,
            kind: crossterm::event::KeyEventKind::Press,
            state: crossterm::event::KeyEventState::NONE,
        }),
        &ctx,
    );
    let buf = render_to_buffer(&mut model, 80, 24);
    let rendered = buffer_to_string(&buf);
    insta::assert_snapshot!("palette_open_80x24", rendered);
}

// ── Wizard (new token modal) ──────────────────────────────────────────────────

/// The wizard in its first screen (new token property entry).
#[test]
fn snapshot_wizard_screen1() {
    let graph = make_graph_with_tokens(&["accent-background-color-default"]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(
        &mut model,
        Message::PaletteSubmit("new background-color".into()),
        &ctx,
    );
    let buf = render_to_buffer(&mut model, 80, 24);
    let rendered = buffer_to_string(&buf);
    insta::assert_snapshot!("wizard_screen1_80x24", rendered);
}
