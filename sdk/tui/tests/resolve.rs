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
use design_data_core::graph::{Layer, ModeSetRecord, TokenGraph, TokenRecord};
use design_data_tui::app::{ActiveView, App, SubmitContext};
use serde_json::json;
use std::path::PathBuf;

fn key(code: KeyCode) -> KeyEvent {
    KeyEvent::new(code, KeyModifiers::NONE)
}

fn make_resolve_graph() -> TokenGraph {
    // Three tokens for "background-color":
    //   - base (no colorScheme → wildcard, specificity 0)
    //   - light (colorScheme=light, specificity 0 because light is the default)
    //   - dark  (colorScheme=dark,  specificity 1 because dark is non-default)
    let color_scheme_ms = ModeSetRecord {
        file: PathBuf::from("mode-sets/color-scheme.json"),
        name: "colorScheme".into(),
        modes: vec!["light".into(), "dark".into()],
        default_mode: "light".into(),
    };
    let records = vec![
        TokenRecord {
            name: "bg-base".into(),
            file: PathBuf::from("tokens.json"),
            index: 0,
            schema_url: None,
            uuid: None,
            alias_target: None,
            raw: json!({"name": {"property": "background-color"}, "value": "#fff"}),
            layer: Layer::Foundation,
        },
        TokenRecord {
            name: "bg-light".into(),
            file: PathBuf::from("tokens.json"),
            index: 1,
            schema_url: None,
            uuid: None,
            alias_target: None,
            raw: json!({"name": {"property": "background-color", "colorScheme": "light"}, "value": "#f0f0f0"}),
            layer: Layer::Foundation,
        },
        TokenRecord {
            name: "bg-dark".into(),
            file: PathBuf::from("tokens.json"),
            index: 2,
            schema_url: None,
            uuid: None,
            alias_target: None,
            raw: json!({"name": {"property": "background-color", "colorScheme": "dark"}, "value": "#111"}),
            layer: Layer::Foundation,
        },
    ];
    TokenGraph::from_records(records).with_mode_sets(vec![color_scheme_ms])
}

fn submit_command(app: &mut App, graph: &TokenGraph, cmd: &str) {
    app.handle_key(key(KeyCode::Char(':')));
    for c in cmd.chars() {
        app.handle_key(key(KeyCode::Char(c)));
    }
    app.submit_palette(&SubmitContext::new(graph));
}

#[test]
fn resolve_with_matching_property_returns_resolve_view() {
    let graph = make_resolve_graph();
    let mut app = App::new();
    submit_command(&mut app, &graph, "resolve property=background-color");
    assert!(
        matches!(app.active_view, ActiveView::Resolve(_)),
        "expected Resolve view"
    );
}

#[test]
fn resolve_view_has_winner() {
    let graph = make_resolve_graph();
    let mut app = App::new();
    submit_command(&mut app, &graph, "resolve property=background-color");
    if let ActiveView::Resolve(ref rv) = app.active_view {
        assert!(!rv.rows.is_empty(), "expected candidates");
        // First row should be winner (highest-precedence candidate).
        assert!(rv.rows[0].is_winner, "expected first row to be winner");
    } else {
        panic!("expected Resolve view");
    }
}

#[test]
fn resolve_no_args_sets_error_status() {
    let graph = make_resolve_graph();
    let mut app = App::new();
    submit_command(&mut app, &graph, "resolve");
    assert!(matches!(app.active_view, ActiveView::Empty));
    let msg = app.status_message.as_ref().map(|m| m.text.as_str()).unwrap_or("");
    assert!(msg.contains("required") || msg.contains("error"), "expected error: {msg}");
}

#[test]
fn resolve_unknown_property_returns_empty_candidates() {
    let graph = make_resolve_graph();
    let mut app = App::new();
    submit_command(&mut app, &graph, "resolve property=nonexistent-property");
    if let ActiveView::Resolve(ref rv) = app.active_view {
        assert!(rv.rows.is_empty(), "expected no candidates");
    } else {
        panic!("expected Resolve view");
    }
    let msg = app.status_message.as_ref().map(|m| m.text.as_str()).unwrap_or("");
    assert!(msg.contains("no match"), "expected 'no match': {msg}");
}

#[test]
fn resolve_with_color_scheme_context_selects_dark_winner() {
    let graph = make_resolve_graph();
    let mut app = App::new();
    submit_command(
        &mut app,
        &graph,
        "resolve property=background-color,colorScheme=dark",
    );
    if let ActiveView::Resolve(ref rv) = app.active_view {
        assert!(!rv.rows.is_empty());
        let winner = rv.rows.iter().find(|r| r.is_winner);
        assert!(winner.is_some(), "expected a winner");
        // Dark token has higher specificity and should win in dark context.
        let w = winner.unwrap();
        assert!(
            w.name.contains("dark") || w.name.contains("colorScheme=dark"),
            "expected dark token to win, got: {}",
            w.name
        );
    } else {
        panic!("expected Resolve view");
    }
}

#[test]
fn resolve_selection_starts_at_zero() {
    let graph = make_resolve_graph();
    let mut app = App::new();
    submit_command(&mut app, &graph, "resolve property=background-color");
    if let ActiveView::Resolve(ref rv) = app.active_view {
        assert_eq!(rv.table_state.selected(), Some(0));
    } else {
        panic!("expected Resolve view");
    }
}

#[test]
fn resolve_j_k_navigate() {
    let graph = make_resolve_graph();
    let mut app = App::new();
    submit_command(&mut app, &graph, "resolve property=background-color");
    app.handle_key(key(KeyCode::Char('j')));
    if let ActiveView::Resolve(ref rv) = app.active_view {
        assert_eq!(rv.table_state.selected(), Some(1));
    } else {
        panic!("expected Resolve view");
    }
    app.handle_key(key(KeyCode::Char('k')));
    if let ActiveView::Resolve(ref rv) = app.active_view {
        assert_eq!(rv.table_state.selected(), Some(0));
    } else {
        panic!("expected Resolve view");
    }
}

#[test]
fn resolve_y_sets_pending_yank() {
    let graph = make_resolve_graph();
    let mut app = App::new();
    submit_command(&mut app, &graph, "resolve property=background-color");
    app.handle_key(key(KeyCode::Char('y')));
    assert!(app.pending_yank.is_some(), "expected pending yank");
}

#[test]
fn esc_from_resolve_view_returns_to_empty() {
    let graph = make_resolve_graph();
    let mut app = App::new();
    submit_command(&mut app, &graph, "resolve property=background-color");
    assert!(matches!(app.active_view, ActiveView::Resolve(_)));
    app.handle_key(key(KeyCode::Esc));
    assert!(matches!(app.active_view, ActiveView::Empty));
}
