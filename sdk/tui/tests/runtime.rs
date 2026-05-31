// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Runtime adapter smoke tests (GH #1021).
//!
//! These tests drive `update` + `draw` through `render_to_buffer` against a `TestBackend`,
//! verifying the full update→draw pipeline without requiring a real terminal or event loop.

mod common;
use common::{empty_graph, key, render_to_buffer, update_ctx};

use crossterm::event::KeyCode;
use design_data_tui::{update, Message, Model};

#[test]
fn smoke_colon_opens_palette_and_renders_prompt() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();

    update(&mut model, Message::Key(key(KeyCode::Char(':'))), &ctx);
    assert!(model.is_palette_open(), "':' should open palette");

    // Drive through draw — must not panic and must render ':' on last row.
    let buf = render_to_buffer(&mut model, 80, 24);
    assert_eq!(
        buf.cell((0, 23)).unwrap().symbol(),
        ":",
        "palette prompt should be ':' on last row"
    );
}

#[test]
fn smoke_esc_closes_palette_and_clears_prompt() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();

    update(&mut model, Message::Key(key(KeyCode::Char(':'))), &ctx);
    update(&mut model, Message::Key(key(KeyCode::Esc)), &ctx);
    assert!(!model.is_palette_open(), "Esc should close palette");

    let buf = render_to_buffer(&mut model, 80, 24);
    let last = (0..80u16)
        .map(|x| buf.cell((x, 23)).unwrap().symbol().to_string())
        .collect::<String>();
    assert!(
        last.trim().is_empty(),
        "palette row should be empty after close, got: '{last}'"
    );
}

#[test]
fn smoke_quit_key_sets_quit_flag() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Char('q'))), &ctx);
    assert!(model.quit, "'q' should set model.quit");
}

#[test]
fn smoke_render_after_query_shows_data_row() {
    let graph = common::make_graph_with_tokens(&["accent-color"]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();

    update(
        &mut model,
        Message::PaletteSubmit("query property=accent-color".into()),
        &ctx,
    );

    let buf = render_to_buffer(&mut model, 80, 24);
    let found = (0..24u16).any(|y| {
        let row: String = (0..80u16)
            .map(|x| buf.cell((x, y)).unwrap().symbol().to_string())
            .collect();
        row.contains("accent-color")
    });
    assert!(
        found,
        "query result 'accent-color' should appear somewhere in the rendered buffer"
    );
}

#[test]
fn smoke_model_new_with_options_resume_false_has_no_modal() {
    let model = Model::new_with_options(false);
    assert!(
        !model.is_modal_open(),
        "resume_wizard=false should yield no modal"
    );
}
