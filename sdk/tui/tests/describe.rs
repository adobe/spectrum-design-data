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
use design_data_core::graph::{ComponentRecord, TokenGraph};
use design_data_tui::app::{ActiveView, App, SubmitContext};
use serde_json::json;
use std::path::PathBuf;

fn key(code: KeyCode) -> KeyEvent {
    KeyEvent::new(code, KeyModifiers::NONE)
}

fn fixtures_components_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/components")
}

fn make_graph_with_components() -> TokenGraph {
    let comps = vec![ComponentRecord {
        name: "button".into(),
        file: fixtures_components_dir().join("button.json"),
        raw: json!({"name": "button", "description": "A clickable button."}),
    }];
    TokenGraph::default().with_components(comps)
}

fn submit_describe(app: &mut App, graph: &TokenGraph, components_dir: &std::path::Path, id: &str) {
    app.handle_key(key(KeyCode::Char(':')));
    for c in format!("describe {id}").chars() {
        app.handle_key(key(KeyCode::Char(c)));
    }
    let ctx = SubmitContext {
        graph,
        dataset_path: None,
        components_dir: Some(components_dir),
        schema_registry: None,
        mode_sets_dir: None,
    };
    app.submit_palette(&ctx);
}

#[test]
fn describe_known_component_returns_describe_view() {
    let graph = make_graph_with_components();
    let dir = fixtures_components_dir();
    let mut app = App::new();
    submit_describe(&mut app, &graph, &dir, "button");
    assert!(
        matches!(app.active_view, ActiveView::Describe(_)),
        "expected Describe view"
    );
}

#[test]
fn describe_view_has_nonempty_json() {
    let graph = make_graph_with_components();
    let dir = fixtures_components_dir();
    let mut app = App::new();
    submit_describe(&mut app, &graph, &dir, "button");
    if let ActiveView::Describe(ref dv) = app.active_view {
        assert!(!dv.pretty_json.is_empty(), "expected non-empty JSON");
        assert!(dv.component == "button");
    } else {
        panic!("expected Describe view");
    }
}

#[test]
fn describe_unknown_component_sets_error_status() {
    let graph = make_graph_with_components();
    let dir = fixtures_components_dir();
    let mut app = App::new();
    submit_describe(&mut app, &graph, &dir, "nonexistent");
    assert!(matches!(app.active_view, ActiveView::Empty));
    let msg = app.status_message.as_ref().map(|m| m.text.as_str()).unwrap_or("");
    assert!(
        msg.contains("unknown component"),
        "expected 'unknown component': {msg}"
    );
}

#[test]
fn describe_unknown_with_components_suggests_match() {
    let graph = make_graph_with_components();
    let dir = fixtures_components_dir();
    let mut app = App::new();
    submit_describe(&mut app, &graph, &dir, "but"); // prefix of "button"
    let msg = app.status_message.as_ref().map(|m| m.text.as_str()).unwrap_or("");
    assert!(
        msg.contains("button"),
        "expected suggestion for 'button' in: {msg}"
    );
}

#[test]
fn describe_invalid_id_sets_error_status() {
    let graph = make_graph_with_components();
    let dir = fixtures_components_dir();
    let mut app = App::new();
    submit_describe(&mut app, &graph, &dir, "Button"); // uppercase not allowed
    let msg = app.status_message.as_ref().map(|m| m.text.as_str()).unwrap_or("");
    assert!(
        msg.contains("invalid"),
        "expected 'invalid' in: {msg}"
    );
}

#[test]
fn describe_no_components_dir_sets_error_status() {
    let graph = TokenGraph::default();
    let mut app = App::new();
    app.handle_key(key(KeyCode::Char(':')));
    for c in "describe button".chars() {
        app.handle_key(key(KeyCode::Char(c)));
    }
    // No components_dir in context.
    app.submit_palette(&SubmitContext::new(&graph));
    let msg = app.status_message.as_ref().map(|m| m.text.as_str()).unwrap_or("");
    assert!(
        msg.contains("no components directory"),
        "expected 'no components directory': {msg}"
    );
}

#[test]
fn describe_scroll_changes_with_pgdn_pgup() {
    let graph = make_graph_with_components();
    let dir = fixtures_components_dir();
    let mut app = App::new();
    submit_describe(&mut app, &graph, &dir, "button");
    // PgDn advances scroll.
    app.handle_key(key(KeyCode::PageDown));
    if let ActiveView::Describe(ref dv) = app.active_view {
        assert!(dv.scroll > 0, "scroll should advance with PgDn");
    } else {
        panic!("expected Describe view");
    }
    // PgUp reduces scroll (but clamps at 0).
    app.handle_key(key(KeyCode::PageUp));
    if let ActiveView::Describe(ref dv) = app.active_view {
        assert_eq!(dv.scroll, 0, "scroll should return to 0 after PgUp");
    } else {
        panic!("expected Describe view");
    }
}

#[test]
fn esc_from_describe_view_returns_to_empty() {
    let graph = make_graph_with_components();
    let dir = fixtures_components_dir();
    let mut app = App::new();
    submit_describe(&mut app, &graph, &dir, "button");
    assert!(matches!(app.active_view, ActiveView::Describe(_)));
    app.handle_key(key(KeyCode::Esc));
    assert!(matches!(app.active_view, ActiveView::Empty));
}
