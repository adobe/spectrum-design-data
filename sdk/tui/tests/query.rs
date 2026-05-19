// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};
use design_data_core::graph::{Layer, TokenGraph, TokenRecord};
use design_data_tui::app::{ActiveView, App, SubmitContext};
use serde_json::json;
use std::path::PathBuf;

fn key(code: KeyCode) -> KeyEvent {
    KeyEvent::new(code, KeyModifiers::NONE)
}

fn make_graph_with_tokens(names: &[&str]) -> TokenGraph {
    let records: Vec<TokenRecord> = names
        .iter()
        .enumerate()
        .map(|(i, &name)| TokenRecord {
            name: name.to_string(),
            file: PathBuf::from("test.json"),
            index: i,
            schema_url: None,
            uuid: None,
            alias_target: None,
            // Include name.property so property=* queries match.
            raw: json!({
                "value": "red",
                "$schema": "https://example.com",
                "name": { "property": name }
            }),
            layer: Layer::Foundation,
        })
        .collect();
    TokenGraph::from_records(records)
}

fn empty_graph() -> TokenGraph {
    make_graph_with_tokens(&[])
}

#[test]
fn submit_valid_query_populates_query_view() {
    let graph = make_graph_with_tokens(&["accent-color", "background-color"]);
    let mut app = App::new();
    // Simulate opening palette, typing, and submitting.
    app.handle_key(key(KeyCode::Char(':')));
    for c in "query property=accent-color".chars() {
        app.handle_key(key(KeyCode::Char(c)));
    }
    // Palette is still open; submit_palette is called by main.rs after Enter.
    app.submit_palette(&SubmitContext::new(&graph));
    assert!(!app.palette_open);
    assert!(matches!(app.active_view, ActiveView::Query(_)));
}

#[test]
fn submit_query_resets_selection_to_zero() {
    let graph = make_graph_with_tokens(&["accent-color", "background-color"]);
    let mut app = App::new();
    app.handle_key(key(KeyCode::Char(':')));
    for c in "query property=*".chars() {
        app.handle_key(key(KeyCode::Char(c)));
    }
    app.submit_palette(&SubmitContext::new(&graph));
    if let ActiveView::Query(ref qv) = app.active_view {
        assert_eq!(qv.table_state.selected(), Some(0));
    } else {
        panic!("expected Query view");
    }
}

#[test]
fn submit_invalid_query_sets_status_message() {
    let graph = empty_graph();
    let mut app = App::new();
    app.handle_key(key(KeyCode::Char(':')));
    for c in "query ===bad===".chars() {
        app.handle_key(key(KeyCode::Char(c)));
    }
    app.submit_palette(&SubmitContext::new(&graph));
    assert!(!app.palette_open);
    assert!(matches!(app.active_view, ActiveView::Empty));
    let msg = app.status_message.as_ref().map(|m| m.text.as_str()).unwrap_or("");
    assert!(msg.contains("query error") || msg.contains("error"), "expected error message, got: {msg}");
}

#[test]
fn submit_unknown_command_sets_status_message() {
    let graph = empty_graph();
    let mut app = App::new();
    app.handle_key(key(KeyCode::Char(':')));
    for c in "foobar".chars() {
        app.handle_key(key(KeyCode::Char(c)));
    }
    app.submit_palette(&SubmitContext::new(&graph));
    let msg = app.status_message.as_ref().map(|m| m.text.as_str()).unwrap_or("");
    assert!(msg.contains("unknown command"), "expected 'unknown command' in: {msg}");
}

#[test]
fn down_j_moves_selection() {
    let graph = make_graph_with_tokens(&["a", "b", "c"]);
    let mut app = App::new();
    app.handle_key(key(KeyCode::Char(':')));
    for c in "query property=*".chars() {
        app.handle_key(key(KeyCode::Char(c)));
    }
    app.submit_palette(&SubmitContext::new(&graph));
    // Selection starts at 0.
    app.handle_key(key(KeyCode::Char('j')));
    if let ActiveView::Query(ref qv) = app.active_view {
        assert_eq!(qv.table_state.selected(), Some(1));
    } else {
        panic!("expected Query view");
    }
}

#[test]
fn up_k_moves_selection() {
    let graph = make_graph_with_tokens(&["a", "b", "c"]);
    let mut app = App::new();
    app.handle_key(key(KeyCode::Char(':')));
    for c in "query property=*".chars() {
        app.handle_key(key(KeyCode::Char(c)));
    }
    app.submit_palette(&SubmitContext::new(&graph));
    app.handle_key(key(KeyCode::Char('j')));
    app.handle_key(key(KeyCode::Char('k')));
    if let ActiveView::Query(ref qv) = app.active_view {
        assert_eq!(qv.table_state.selected(), Some(0));
    } else {
        panic!("expected Query view");
    }
}

#[test]
fn selection_clamps_at_bounds() {
    let graph = make_graph_with_tokens(&["a", "b"]);
    let mut app = App::new();
    app.handle_key(key(KeyCode::Char(':')));
    for c in "query property=*".chars() {
        app.handle_key(key(KeyCode::Char(c)));
    }
    app.submit_palette(&SubmitContext::new(&graph));
    // Try to go above 0.
    app.handle_key(key(KeyCode::Up));
    if let ActiveView::Query(ref qv) = app.active_view {
        assert_eq!(qv.table_state.selected(), Some(0));
    } else {
        panic!("expected Query view");
    }
    // Go to last, then try to go past.
    app.handle_key(key(KeyCode::Down));
    app.handle_key(key(KeyCode::Down));
    if let ActiveView::Query(ref qv) = app.active_view {
        assert_eq!(qv.table_state.selected(), Some(1));
    } else {
        panic!("expected Query view");
    }
}

#[test]
fn y_sets_yank_pending_with_selected_name() {
    let graph = make_graph_with_tokens(&["accent-color"]);
    let mut app = App::new();
    app.handle_key(key(KeyCode::Char(':')));
    for c in "query property=*".chars() {
        app.handle_key(key(KeyCode::Char(c)));
    }
    app.submit_palette(&SubmitContext::new(&graph));
    app.handle_key(key(KeyCode::Char('y')));
    assert!(app.pending_yank.is_some());
}

#[test]
fn esc_from_query_view_returns_to_empty() {
    let graph = make_graph_with_tokens(&["a"]);
    let mut app = App::new();
    app.handle_key(key(KeyCode::Char(':')));
    for c in "query property=*".chars() {
        app.handle_key(key(KeyCode::Char(c)));
    }
    app.submit_palette(&SubmitContext::new(&graph));
    assert!(matches!(app.active_view, ActiveView::Query(_)));
    app.handle_key(key(KeyCode::Esc));
    assert!(matches!(app.active_view, ActiveView::Empty));
}

#[test]
fn re_query_replaces_results_and_resets_selection() {
    let graph = make_graph_with_tokens(&["a", "b", "c"]);
    let mut app = App::new();
    // First query.
    app.handle_key(key(KeyCode::Char(':')));
    for c in "query property=*".chars() {
        app.handle_key(key(KeyCode::Char(c)));
    }
    app.submit_palette(&SubmitContext::new(&graph));
    app.handle_key(key(KeyCode::Char('j')));
    // Second query from within query view — `:` opens palette.
    app.handle_key(key(KeyCode::Char(':')));
    for c in "query property=*".chars() {
        app.handle_key(key(KeyCode::Char(c)));
    }
    app.submit_palette(&SubmitContext::new(&graph));
    if let ActiveView::Query(ref qv) = app.active_view {
        assert_eq!(qv.table_state.selected(), Some(0));
    } else {
        panic!("expected Query view");
    }
}
