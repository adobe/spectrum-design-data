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
use common::{empty_graph, key, make_graph_with_tokens, update_ctx};

use crossterm::event::KeyCode;
use design_data_tui::app::ActiveView;
use design_data_tui::{update, Message, Model};

#[test]
fn submit_valid_query_populates_query_view() {
    let graph = make_graph_with_tokens(&["accent-color", "background-color"]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(
        &mut model,
        Message::PaletteSubmit("query property=accent-color".into()),
        &ctx,
    );
    assert!(!model.is_palette_open());
    assert!(matches!(model.active_view, ActiveView::Query(_)));
}

#[test]
fn submit_query_resets_selection_to_zero() {
    let graph = make_graph_with_tokens(&["accent-color", "background-color"]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(
        &mut model,
        Message::PaletteSubmit("query property=*".into()),
        &ctx,
    );
    if let ActiveView::Query(ref qv) = model.active_view {
        assert_eq!(qv.table_state.selected(), Some(0));
    } else {
        panic!("expected Query view");
    }
}

#[test]
fn submit_invalid_query_sets_status_message() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(
        &mut model,
        Message::PaletteSubmit("query ===bad===".into()),
        &ctx,
    );
    // After a failed command the home palette stays open (return_home_keep_status).
    assert!(model.is_palette_open());
    assert!(matches!(model.active_view, ActiveView::Empty));
    let msg = model
        .status_message
        .as_ref()
        .map(|m| m.text.as_str())
        .unwrap_or("");
    assert!(
        msg.contains("query error") || msg.contains("error"),
        "expected error message, got: {msg}"
    );
}

#[test]
fn submit_unknown_command_sets_status_message() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::PaletteSubmit("foobar".into()), &ctx);
    let msg = model
        .status_message
        .as_ref()
        .map(|m| m.text.as_str())
        .unwrap_or("");
    assert!(
        msg.contains("unknown command"),
        "expected 'unknown command' in: {msg}"
    );
}

#[test]
fn down_j_moves_selection() {
    let graph = make_graph_with_tokens(&["a", "b", "c"]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(
        &mut model,
        Message::PaletteSubmit("query property=*".into()),
        &ctx,
    );
    update(&mut model, Message::Key(key(KeyCode::Char('j'))), &ctx);
    if let ActiveView::Query(ref qv) = model.active_view {
        assert_eq!(qv.table_state.selected(), Some(1));
    } else {
        panic!("expected Query view");
    }
}

#[test]
fn up_k_moves_selection() {
    let graph = make_graph_with_tokens(&["a", "b", "c"]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(
        &mut model,
        Message::PaletteSubmit("query property=*".into()),
        &ctx,
    );
    update(&mut model, Message::Key(key(KeyCode::Char('j'))), &ctx);
    update(&mut model, Message::Key(key(KeyCode::Char('k'))), &ctx);
    if let ActiveView::Query(ref qv) = model.active_view {
        assert_eq!(qv.table_state.selected(), Some(0));
    } else {
        panic!("expected Query view");
    }
}

#[test]
fn selection_clamps_at_bounds() {
    let graph = make_graph_with_tokens(&["a", "b"]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(
        &mut model,
        Message::PaletteSubmit("query property=*".into()),
        &ctx,
    );
    update(&mut model, Message::Key(key(KeyCode::Up)), &ctx);
    if let ActiveView::Query(ref qv) = model.active_view {
        assert_eq!(qv.table_state.selected(), Some(0));
    } else {
        panic!("expected Query view");
    }
    update(&mut model, Message::Key(key(KeyCode::Down)), &ctx);
    update(&mut model, Message::Key(key(KeyCode::Down)), &ctx);
    if let ActiveView::Query(ref qv) = model.active_view {
        assert_eq!(qv.table_state.selected(), Some(1));
    } else {
        panic!("expected Query view");
    }
}

#[test]
fn y_sets_yank_pending_with_selected_name() {
    let graph = make_graph_with_tokens(&["accent-color"]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(
        &mut model,
        Message::PaletteSubmit("query property=*".into()),
        &ctx,
    );
    let task = update(&mut model, Message::Key(key(KeyCode::Char('y'))), &ctx);
    // 'y' now returns Task::Cmd (clipboard write) instead of setting pending_yank.
    assert!(
        task.is_cmd(),
        "'y' should return Task::Cmd for clipboard write"
    );
    assert!(
        model.pending_yank.is_none(),
        "pending_yank should not be set"
    );
}

#[test]
fn esc_from_query_view_returns_to_empty() {
    let graph = make_graph_with_tokens(&["a"]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(
        &mut model,
        Message::PaletteSubmit("query property=*".into()),
        &ctx,
    );
    assert!(matches!(model.active_view, ActiveView::Query(_)));
    update(&mut model, Message::Key(key(KeyCode::Esc)), &ctx);
    assert!(matches!(model.active_view, ActiveView::Empty));
}

#[test]
fn re_query_replaces_results_and_resets_selection() {
    let graph = make_graph_with_tokens(&["a", "b", "c"]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(
        &mut model,
        Message::PaletteSubmit("query property=*".into()),
        &ctx,
    );
    update(&mut model, Message::Key(key(KeyCode::Char('j'))), &ctx);
    update(
        &mut model,
        Message::PaletteSubmit("query property=*".into()),
        &ctx,
    );
    if let ActiveView::Query(ref qv) = model.active_view {
        assert_eq!(qv.table_state.selected(), Some(0));
    } else {
        panic!("expected Query view");
    }
}

#[test]
fn g_key_jumps_to_first_row() {
    let graph = make_graph_with_tokens(&["a", "b", "c"]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(
        &mut model,
        Message::PaletteSubmit("query property=*".into()),
        &ctx,
    );
    // Move to row 2, then jump back to first.
    update(&mut model, Message::Key(key(KeyCode::Char('j'))), &ctx);
    update(&mut model, Message::Key(key(KeyCode::Char('j'))), &ctx);
    update(&mut model, Message::Key(key(KeyCode::Char('g'))), &ctx);
    if let ActiveView::Query(ref qv) = model.active_view {
        assert_eq!(
            qv.table_state.selected(),
            Some(0),
            "g should jump to first row"
        );
    } else {
        panic!("expected Query view");
    }
}

#[test]
fn shift_g_key_jumps_to_last_row() {
    let graph = make_graph_with_tokens(&["a", "b", "c"]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(
        &mut model,
        Message::PaletteSubmit("query property=*".into()),
        &ctx,
    );
    update(&mut model, Message::Key(key(KeyCode::Char('G'))), &ctx);
    if let ActiveView::Query(ref qv) = model.active_view {
        let last = qv.rows.len() - 1;
        assert_eq!(
            qv.table_state.selected(),
            Some(last),
            "G should jump to last row (index {last})"
        );
    } else {
        panic!("expected Query view");
    }
}
