// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Buffer-cell render tests (GH #1017).
//!
//! Pattern: build Model state via `update()`, call render_to_buffer, assert specific cells.
//! No snapshot deps — assertions are direct `buf.cell((x, y)).symbol()` checks.

mod common;
use common::{key, make_graph_with_tokens, render_to_buffer, update_ctx, TEST_PRIMER};

use crossterm::event::KeyCode;
use design_data_core::graph::{Layer, ModeSetRecord, TokenGraph, TokenRecord};
use design_data_tui::app::{ActiveView, DescribeView, ValidateView};
use ratatui::widgets::TableState;
use design_data_tui::{update, Message, Model};
use ratatui::buffer::Buffer;
use serde_json::json;
use std::path::PathBuf;

// ── Helpers ────────────────────────────────────────────────────────────────────

const W: u16 = 80;
const H: u16 = 24;

/// Collect a single row of the buffer as a `String`.
fn row_str(buf: &Buffer, y: u16, w: u16) -> String {
    (0..w)
        .map(|x| buf.cell((x, y)).unwrap().symbol().to_string())
        .collect()
}

/// Scan all rows for the first one whose text contains `needle`. Returns that
/// row's content as a String, or panics with a helpful message if not found.
fn find_row_containing(buf: &Buffer, needle: &str, w: u16, h: u16) -> String {
    for y in 0..h {
        let row = row_str(buf, y, w);
        if row.contains(needle) {
            return row;
        }
    }
    panic!("no row contains '{needle}' in {w}×{h} buffer");
}

/// Open command palette, type `cmd`, submit.
fn submit_query(model: &mut Model, ctx: &design_data_tui::UpdateCtx<'_>, cmd: &str) {
    update(model, Message::PaletteSubmit(cmd.into()), ctx);
}

// ── Empty / initial view ───────────────────────────────────────────────────────

#[test]
fn empty_app_renders_primer_arrow() {
    let mut model = Model::new();
    let buf = render_to_buffer(&mut model, W, H);
    assert_eq!(buf.cell((0, 0)).unwrap().symbol(), "▶");
}

#[test]
fn empty_app_renders_primer_text() {
    let mut model = Model::new();
    let buf = render_to_buffer(&mut model, W, H);
    let row = row_str(&buf, 0, W);
    assert!(
        row.contains(TEST_PRIMER),
        "primer row should contain '{TEST_PRIMER}', got: {row}"
    );
}

#[test]
fn empty_app_renders_home_screen_tall() {
    // Tall terminal (48 rows): logo threshold is met — all sections visible.
    const H_TALL: u16 = 48;
    let mut model = Model::new();
    let buf = render_to_buffer(&mut model, W, H_TALL);

    let rows = |needle: &str| (1..H_TALL - 1).any(|y| row_str(&buf, y, W).contains(needle));

    assert!(rows("▀"), "logo (▀▀▀ row) should appear in a tall terminal");
    assert!(rows("Spectrum Design Data"), "name line should appear");
    assert!(rows("validate"), "command list should appear");
    assert!(rows(">"), "prompt cue should appear");
}

#[test]
fn empty_app_renders_home_screen_short() {
    // Short terminal (24 rows = 22 content rows): logo is omitted, but name,
    // hint, prompt, and command table still render within the available space.
    let mut model = Model::new();
    let buf = render_to_buffer(&mut model, W, H);

    let rows = |needle: &str| (1..H - 1).any(|y| row_str(&buf, y, W).contains(needle));

    assert!(!rows("▀"), "logo should be hidden on a short terminal");
    assert!(rows("Spectrum Design Data"), "name line should appear even without logo");
    assert!(rows(">"), "prompt cue should appear even without logo");
}

#[test]
fn bottom_strip_is_empty_on_home() {
    // chunk[3] is Length(0) — the palette renders in the home view area, not here.
    let mut model = Model::new();
    let buf = render_to_buffer(&mut model, W, H);
    let last_row = row_str(&buf, H - 1, W);
    assert!(
        last_row.trim().is_empty(),
        "bottom strip should be empty on home screen, got: '{last_row}'"
    );
}

// ── Query view ────────────────────────────────────────────────────────────────

#[test]
fn query_view_renders_column_headers() {
    let graph = make_graph_with_tokens(&["accent-color", "background-color"]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    submit_query(&mut model, &ctx, "query property=accent-color");

    let buf = render_to_buffer(&mut model, W, H);
    let header_row = find_row_containing(&buf, "Name", W, H);
    assert!(
        header_row.contains("Value"),
        "header should also contain 'Value': {header_row}"
    );
}

#[test]
fn query_view_renders_token_name_in_data_row() {
    let graph = make_graph_with_tokens(&["accent-color"]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    submit_query(&mut model, &ctx, "query property=accent-color");

    let buf = render_to_buffer(&mut model, W, H);
    find_row_containing(&buf, "accent-color", W, H);
}

// ── Help modal ─────────────────────────────────────────────────────────────────

#[test]
fn help_modal_renders_title() {
    let graph = make_graph_with_tokens(&[]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Char('?'))), &ctx);
    let buf = render_to_buffer(&mut model, W, H);
    find_row_containing(&buf, "Help", W, H);
}

// ── Palette prompt ─────────────────────────────────────────────────────────────

#[test]
fn home_palette_renders_arrow_prompt() {
    // The home screen is always in palette mode; the prompt shows "> ".
    let mut model = Model::new();
    let buf = render_to_buffer(&mut model, W, H);
    // '>' should appear somewhere in the content area (not the last strip row).
    let any_gt = (1..H - 1).any(|y| {
        (0..W).any(|x| buf.cell((x, y)).unwrap().symbol() == ">")
    });
    assert!(any_gt, "home screen should render '>' prompt prefix");
}

#[test]
fn typing_in_palette_updates_home_prompt() {
    // Typing '/' (no longer a special key) just goes into the palette buffer.
    let graph = make_graph_with_tokens(&[]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Char('/'))), &ctx);
    // The model input should contain '/'.
    assert_eq!(model.palette_input_value(), "/");
    // The last strip row (chunk[3]) should remain empty.
    let buf = render_to_buffer(&mut model, W, H);
    let last_row = row_str(&buf, H - 1, W);
    assert!(last_row.trim().is_empty(), "bottom strip should be empty");
}

// ── Footer hints ─────────────────────────────────────────────────────────────

#[test]
fn query_view_renders_footer_hint_line() {
    let graph = make_graph_with_tokens(&["accent-color"]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    submit_query(&mut model, &ctx, "query property=accent-color");
    let buf = render_to_buffer(&mut model, W, H);
    find_row_containing(&buf, "j/k navigate", W, H);
}

#[test]
fn query_view_hint_includes_g_g_shortcut() {
    let graph = make_graph_with_tokens(&["accent-color"]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    submit_query(&mut model, &ctx, "query property=accent-color");
    let buf = render_to_buffer(&mut model, W, H);
    let hint_row = find_row_containing(&buf, "j/k navigate", W, H);
    assert!(
        hint_row.contains("g/G"),
        "footer hint should advertise g/G: {hint_row}"
    );
}

// ── Empty-state copy ──────────────────────────────────────────────────────────

#[test]
fn query_view_empty_state_shows_hint() {
    let graph = make_graph_with_tokens(&["accent-color"]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    submit_query(&mut model, &ctx, "query property=zzznomatch");
    let buf = render_to_buffer(&mut model, W, H);
    find_row_containing(&buf, "No tokens matched", W, H);
}

#[test]
fn query_view_empty_state_still_shows_footer_hint() {
    let graph = make_graph_with_tokens(&["accent-color"]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    submit_query(&mut model, &ctx, "query property=zzznomatch");
    let buf = render_to_buffer(&mut model, W, H);
    find_row_containing(&buf, "j/k navigate", W, H);
}

// ── Resolve empty state ───────────────────────────────────────────────────────

/// Build a minimal resolve-capable graph (same shape as tests/resolve.rs).
fn make_resolve_graph() -> TokenGraph {
    let ms = ModeSetRecord {
        file: PathBuf::from("mode-sets/color-scheme.json"),
        name: "colorScheme".into(),
        modes: vec!["light".into(), "dark".into()],
        default_mode: "light".into(),
    };
    let records = vec![TokenRecord {
        name: "bg-base".into(),
        file: PathBuf::from("tokens.json"),
        index: 0,
        schema_url: None,
        uuid: None,
        alias_target: None,
        raw: json!({"name": {"property": "background-color"}, "value": "#fff"}),
        layer: Layer::Foundation,
    }];
    TokenGraph::from_records(records).with_mode_sets(vec![ms])
}

#[test]
fn resolve_empty_state_shows_no_match_copy() {
    let graph = make_resolve_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::PaletteSubmit("resolve property=nonexistent-property".into()), &ctx);
    let buf = render_to_buffer(&mut model, W, H);
    find_row_containing(&buf, "No match for that property", W, H);
}

#[test]
fn resolve_empty_state_shows_footer_hint() {
    let graph = make_resolve_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::PaletteSubmit("resolve property=nonexistent-property".into()), &ctx);
    let buf = render_to_buffer(&mut model, W, H);
    find_row_containing(&buf, "j/k navigate", W, H);
}

// ── Validate empty state ──────────────────────────────────────────────────────

#[test]
fn validate_empty_state_shows_all_valid_copy() {
    // Drive the validate view into the zero-errors state by injecting it directly,
    // mirroring the m5 pattern for views that require complex IO setup.
    let mut model = Model::new();
    model.active_view = ActiveView::Validate(ValidateView { rows: vec![], table_state: TableState::default() });
    let buf = render_to_buffer(&mut model, W, H);
    find_row_containing(&buf, "All tokens valid", W, H);
}

#[test]
fn validate_empty_state_shows_footer_hint() {
    let mut model = Model::new();
    model.active_view = ActiveView::Validate(ValidateView { rows: vec![], table_state: TableState::default() });
    let buf = render_to_buffer(&mut model, W, H);
    find_row_containing(&buf, "j/k navigate", W, H);
}

// ── Describe footer hint ──────────────────────────────────────────────────────

#[test]
fn describe_view_footer_hint_includes_g_g() {
    let mut model = Model::new();
    model.active_view = ActiveView::Describe(DescribeView {
        component: "button".to_string(),
        pretty_json: "{\n  \"name\": \"button\"\n}".to_string(),
        scroll: 0,
    });
    let buf = render_to_buffer(&mut model, W, H);
    let hint_row = find_row_containing(&buf, "j/k scroll", W, H);
    assert!(
        hint_row.contains("g/G"),
        "describe footer hint should advertise g/G: {hint_row}"
    );
}

// ── Determinism ───────────────────────────────────────────────────────────────

#[test]
fn two_consecutive_renders_are_identical() {
    let mut model = Model::new();
    let buf1 = render_to_buffer(&mut model, W, H);
    let buf2 = render_to_buffer(&mut model, W, H);
    assert!(
        buf1 == buf2,
        "draw must be deterministic — two renders of the same state must be identical"
    );
}

// ── Panic safety ──────────────────────────────────────────────────────────────

#[test]
fn draw_does_not_panic_on_1x1_terminal() {
    let mut model = Model::new();
    render_to_buffer(&mut model, 1, 1);
}

#[test]
fn draw_does_not_panic_on_narrow_terminal() {
    let mut model = Model::new();
    render_to_buffer(&mut model, 10, 5);
}
