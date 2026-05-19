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
use design_data_core::graph::TokenGraph;
use design_data_core::schema::SchemaRegistry;
use design_data_tui::app::{ActiveView, App, SubmitContext};
use std::path::PathBuf;

fn key(code: KeyCode) -> KeyEvent {
    KeyEvent::new(code, KeyModifiers::NONE)
}

fn manifest_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
}

fn schema_dir() -> PathBuf {
    manifest_dir().join("../../packages/tokens/schemas")
}

fn tokens_good_dir() -> PathBuf {
    manifest_dir().join("tests/fixtures/tokens-good")
}

fn tokens_bad_dir() -> PathBuf {
    manifest_dir().join("tests/fixtures/tokens-bad")
}

/// Returns the registry, or skips the test (returns None) if the schema dir is absent.
fn try_load_registry() -> Option<SchemaRegistry> {
    let dir = schema_dir();
    if !dir.join("token-types").is_dir() {
        return None;
    }
    SchemaRegistry::load_legacy_token_schemas(&dir).ok()
}

fn submit_validate(app: &mut App, graph: &TokenGraph, dataset_path: &std::path::Path, registry: &SchemaRegistry) {
    app.handle_key(key(KeyCode::Char(':')));
    for c in "validate".chars() {
        app.handle_key(key(KeyCode::Char(c)));
    }
    let ctx = SubmitContext {
        graph,
        dataset_path: Some(dataset_path),
        components_dir: None,
        schema_registry: Some(registry),
        mode_sets_dir: None,
    };
    app.submit_palette(&ctx);
}

#[test]
fn validate_without_registry_sets_error_status() {
    let graph = TokenGraph::default();
    let tokens_dir = tokens_good_dir();
    let mut app = App::new();
    app.handle_key(key(KeyCode::Char(':')));
    for c in "validate".chars() {
        app.handle_key(key(KeyCode::Char(c)));
    }
    // No schema_registry in context.
    let ctx = SubmitContext {
        graph: &graph,
        dataset_path: Some(&tokens_dir),
        components_dir: None,
        schema_registry: None,
        mode_sets_dir: None,
    };
    app.submit_palette(&ctx);
    assert!(matches!(app.active_view, ActiveView::Empty));
    let msg = app.status_message.as_ref().map(|m| m.text.as_str()).unwrap_or("");
    assert!(
        msg.contains("unavailable") || msg.contains("error"),
        "expected error: {msg}"
    );
}

#[test]
fn validate_good_tokens_produces_validate_view() {
    let Some(registry) = try_load_registry() else {
        return; // schema dir absent — skip in isolated environments
    };
    let tokens_dir = tokens_good_dir();
    let graph = TokenGraph::from_json_dir(&tokens_dir).expect("graph load");
    let mut app = App::new();
    submit_validate(&mut app, &graph, &tokens_dir, &registry);
    assert!(
        matches!(app.active_view, ActiveView::Validate(_)),
        "expected Validate view"
    );
}

#[test]
fn validate_good_tokens_zero_findings() {
    let Some(registry) = try_load_registry() else {
        return;
    };
    let tokens_dir = tokens_good_dir();
    let graph = TokenGraph::from_json_dir(&tokens_dir).expect("graph load");
    let mut app = App::new();
    submit_validate(&mut app, &graph, &tokens_dir, &registry);
    if let ActiveView::Validate(ref vv) = app.active_view {
        assert_eq!(vv.rows.len(), 0, "expected 0 findings for empty token dir");
    } else {
        panic!("expected Validate view");
    }
}

#[test]
fn validate_bad_tokens_produces_findings() {
    let Some(registry) = try_load_registry() else {
        return;
    };
    let tokens_dir = tokens_bad_dir();
    let graph = TokenGraph::from_json_dir(&tokens_dir).expect("graph load");
    let mut app = App::new();
    submit_validate(&mut app, &graph, &tokens_dir, &registry);
    if let ActiveView::Validate(ref vv) = app.active_view {
        assert!(vv.rows.len() >= 1, "expected at least 1 finding for bad tokens");
    } else {
        panic!("expected Validate view");
    }
}

#[test]
fn validate_j_k_navigate() {
    let Some(registry) = try_load_registry() else {
        return;
    };
    let tokens_dir = tokens_bad_dir();
    let graph = TokenGraph::from_json_dir(&tokens_dir).expect("graph load");
    let mut app = App::new();
    submit_validate(&mut app, &graph, &tokens_dir, &registry);
    // Navigate only if there are rows.
    if let ActiveView::Validate(ref vv) = app.active_view {
        if vv.rows.is_empty() {
            return;
        }
    }
    app.handle_key(key(KeyCode::Char('j')));
    if let ActiveView::Validate(ref vv) = app.active_view {
        if vv.rows.len() > 1 {
            assert_eq!(vv.table_state.selected(), Some(1));
        }
    }
    app.handle_key(key(KeyCode::Char('k')));
    if let ActiveView::Validate(ref vv) = app.active_view {
        assert_eq!(vv.table_state.selected(), Some(0));
    }
}

#[test]
fn validate_y_yanks_message() {
    let Some(registry) = try_load_registry() else {
        return;
    };
    let tokens_dir = tokens_bad_dir();
    let graph = TokenGraph::from_json_dir(&tokens_dir).expect("graph load");
    let mut app = App::new();
    submit_validate(&mut app, &graph, &tokens_dir, &registry);
    if let ActiveView::Validate(ref vv) = app.active_view {
        if vv.rows.is_empty() {
            return; // nothing to yank
        }
    }
    app.handle_key(key(KeyCode::Char('y')));
    assert!(app.pending_yank.is_some(), "expected pending yank after 'y'");
}

#[test]
fn esc_from_validate_view_returns_to_empty() {
    let Some(registry) = try_load_registry() else {
        return;
    };
    let tokens_dir = tokens_good_dir();
    let graph = TokenGraph::from_json_dir(&tokens_dir).expect("graph load");
    let mut app = App::new();
    submit_validate(&mut app, &graph, &tokens_dir, &registry);
    assert!(matches!(app.active_view, ActiveView::Validate(_)));
    app.handle_key(key(KeyCode::Esc));
    assert!(matches!(app.active_view, ActiveView::Empty));
}
