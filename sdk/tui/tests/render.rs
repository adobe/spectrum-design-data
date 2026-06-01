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
use design_data_tui::{update, Message, Model};
use ratatui::buffer::Buffer;

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
fn empty_app_renders_home_screen() {
    let mut model = Model::new();
    // The home screen needs ~31 content rows (17-line logo + spacers + name +
    // hint + prompt + 8 commands). The standard H=24 terminal only provides 22
    // content rows (24 minus primer and palette), clipping the command table.
    // Use a taller buffer so every section of the home screen is visible.
    const H_TALL: u16 = 48;
    let buf = render_to_buffer(&mut model, W, H_TALL);

    // Logo: the bottom ▀▀▀ row must appear somewhere in the content area.
    let has_logo = (1..H_TALL - 1).any(|y| row_str(&buf, y, W).contains('▀'));
    assert!(has_logo, "expected Spectrum logo (▀▀▀ row) in main-content rows");

    // Version line: "Spectrum Design Data  v0.x.x" must appear.
    let has_name = (1..H_TALL - 1).any(|y| row_str(&buf, y, W).contains("Spectrum Design Data"));
    assert!(has_name, "expected 'Spectrum Design Data' version line in home screen");

    // Command table: at least one well-known command name must be present.
    let has_command = (1..H_TALL - 1).any(|y| row_str(&buf, y, W).contains(":validate"));
    assert!(has_command, "expected ':validate' command entry in home screen command table");

    // Prompt cue: the '>' marker must appear.
    let has_prompt = (1..H_TALL - 1).any(|y| row_str(&buf, y, W).contains('>'));
    assert!(has_prompt, "expected '>' prompt cue in home screen");
}

#[test]
fn empty_app_palette_prompt_row_is_last() {
    let mut model = Model::new();
    let buf = render_to_buffer(&mut model, W, H);
    let last_row = row_str(&buf, H - 1, W);
    assert!(
        last_row.trim().is_empty(),
        "palette row should be empty when closed, got: '{last_row}'"
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
fn open_palette_renders_colon_on_last_row() {
    let graph = make_graph_with_tokens(&[]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Char(':'))), &ctx);
    let buf = render_to_buffer(&mut model, W, H);
    assert_eq!(
        buf.cell((0, H - 1)).unwrap().symbol(),
        ":",
        "palette prompt should start with ':' in command mode"
    );
}

#[test]
fn fuzzy_palette_renders_slash_on_last_row() {
    let graph = make_graph_with_tokens(&[]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Char('/'))), &ctx);
    let buf = render_to_buffer(&mut model, W, H);
    assert_eq!(
        buf.cell((0, H - 1)).unwrap().symbol(),
        "/",
        "palette prompt should start with '/' in fuzzy mode"
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
