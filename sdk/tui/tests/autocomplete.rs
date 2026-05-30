// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

mod common;
use common::{empty_graph, key, update_ctx};

use crossterm::event::KeyCode;
use design_data_tui::{update, Message, Model};

fn type_str(model: &mut Model, ctx: &design_data_tui::UpdateCtx<'_>, s: &str) {
    for c in s.chars() {
        update(model, Message::Key(key(KeyCode::Char(c))), ctx);
    }
}

#[test]
fn tab_completes_query() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Char(':'))), &ctx);
    type_str(&mut model, &ctx, "q");
    update(&mut model, Message::Key(key(KeyCode::Tab)), &ctx);
    assert_eq!(model.palette_input_value(), "query ");
}

#[test]
fn tab_completes_resolve() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Char(':'))), &ctx);
    type_str(&mut model, &ctx, "re");
    update(&mut model, Message::Key(key(KeyCode::Tab)), &ctx);
    assert_eq!(model.palette_input_value(), "resolve ");
}

#[test]
fn tab_completes_describe() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Char(':'))), &ctx);
    type_str(&mut model, &ctx, "d");
    update(&mut model, Message::Key(key(KeyCode::Tab)), &ctx);
    assert_eq!(model.palette_input_value(), "describe ");
}

#[test]
fn tab_completes_validate() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Char(':'))), &ctx);
    type_str(&mut model, &ctx, "v");
    update(&mut model, Message::Key(key(KeyCode::Tab)), &ctx);
    assert_eq!(model.palette_input_value(), "validate ");
}

#[test]
fn ambiguous_prefix_sets_status_and_leaves_buffer_unchanged() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Char(':'))), &ctx);
    // Empty prefix matches all commands → ambiguous.
    update(&mut model, Message::Key(key(KeyCode::Tab)), &ctx);
    assert_eq!(model.palette_input_value(), "");
    let msg = model
        .status_message
        .as_ref()
        .map(|m| m.text.as_str())
        .unwrap_or("");
    assert!(
        msg.contains("matches:"),
        "expected 'matches:' in status: {msg}"
    );
}

#[test]
fn tab_after_space_is_noop() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Char(':'))), &ctx);
    type_str(&mut model, &ctx, "query ");
    update(&mut model, Message::Key(key(KeyCode::Tab)), &ctx);
    assert_eq!(model.palette_input_value(), "query ");
}

#[test]
fn tab_on_no_match_is_noop() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Char(':'))), &ctx);
    type_str(&mut model, &ctx, "zzz");
    update(&mut model, Message::Key(key(KeyCode::Tab)), &ctx);
    assert_eq!(model.palette_input_value(), "zzz");
}

#[test]
fn tab_in_fuzzy_mode_is_noop() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Char('/'))), &ctx);
    type_str(&mut model, &ctx, "q");
    update(&mut model, Message::Key(key(KeyCode::Tab)), &ctx);
    assert_eq!(model.palette_input_value(), "q");
}
