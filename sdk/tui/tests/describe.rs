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
use common::key;

use crossterm::event::KeyCode;
use design_data_core::graph::{ComponentRecord, TokenGraph};
use design_data_core::query::TokenIndex;
use design_data_tui::app::ActiveView;
use design_data_tui::{update, Message, Model, UpdateCtx};
use serde_json::json;
use std::path::PathBuf;

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

fn describe_ctx<'a>(graph: &'a TokenGraph, dir: &'a PathBuf) -> UpdateCtx<'a> {
    UpdateCtx {
        graph,
        dataset_path: None,
        components_dir: Some(dir.as_path()),
        schema_registry: None,
        mode_sets_dir: None,
        token_index: TokenIndex::build(graph),
        mode_set_restrictions: std::collections::HashMap::new(),
        allow_write: false,
    }
}

fn submit_describe(model: &mut Model, ctx: &UpdateCtx<'_>, id: &str) {
    update(model, Message::PaletteSubmit(format!("describe {id}")), ctx);
}

#[test]
fn describe_known_component_returns_describe_view() {
    let graph = make_graph_with_components();
    let dir = fixtures_components_dir();
    let ctx = describe_ctx(&graph, &dir);
    let mut model = Model::new();
    submit_describe(&mut model, &ctx, "button");
    assert!(
        matches!(model.active_view, ActiveView::Describe(_)),
        "expected Describe view"
    );
}

#[test]
fn describe_view_has_nonempty_json() {
    let graph = make_graph_with_components();
    let dir = fixtures_components_dir();
    let ctx = describe_ctx(&graph, &dir);
    let mut model = Model::new();
    submit_describe(&mut model, &ctx, "button");
    if let ActiveView::Describe(ref dv) = model.active_view {
        assert!(!dv.pretty_json.is_empty(), "expected non-empty JSON");
        assert_eq!(dv.component, "button");
    } else {
        panic!("expected Describe view");
    }
}

#[test]
fn describe_unknown_component_sets_error_status() {
    let graph = make_graph_with_components();
    let dir = fixtures_components_dir();
    let ctx = describe_ctx(&graph, &dir);
    let mut model = Model::new();
    submit_describe(&mut model, &ctx, "nonexistent");
    assert!(matches!(model.active_view, ActiveView::Empty));
    let msg = model
        .status_message
        .as_ref()
        .map(|m| m.text.as_str())
        .unwrap_or("");
    assert!(
        msg.contains("not found"),
        "expected 'not found' in error message: {msg}"
    );
}

#[test]
fn describe_unknown_with_components_suggests_match() {
    let graph = make_graph_with_components();
    let dir = fixtures_components_dir();
    let ctx = describe_ctx(&graph, &dir);
    let mut model = Model::new();
    submit_describe(&mut model, &ctx, "but");
    let msg = model
        .status_message
        .as_ref()
        .map(|m| m.text.as_str())
        .unwrap_or("");
    assert!(
        msg.contains("button"),
        "expected suggestion for 'button' in: {msg}"
    );
}

#[test]
fn describe_invalid_id_sets_error_status() {
    let graph = make_graph_with_components();
    let dir = fixtures_components_dir();
    let ctx = describe_ctx(&graph, &dir);
    let mut model = Model::new();
    submit_describe(&mut model, &ctx, "Button");
    let msg = model
        .status_message
        .as_ref()
        .map(|m| m.text.as_str())
        .unwrap_or("");
    assert!(msg.contains("invalid"), "expected 'invalid' in: {msg}");
}

#[test]
fn describe_no_components_dir_sets_error_status() {
    let graph = TokenGraph::default();
    let ctx = UpdateCtx::minimal(&graph);
    let mut model = Model::new();
    update(
        &mut model,
        Message::PaletteSubmit("describe button".into()),
        &ctx,
    );
    let msg = model
        .status_message
        .as_ref()
        .map(|m| m.text.as_str())
        .unwrap_or("");
    assert!(
        msg.contains("no components directory"),
        "expected 'no components directory': {msg}"
    );
}

#[test]
fn describe_scroll_changes_with_pgdn_pgup() {
    let graph = make_graph_with_components();
    let dir = fixtures_components_dir();
    let ctx = describe_ctx(&graph, &dir);
    let mut model = Model::new();
    submit_describe(&mut model, &ctx, "button");
    update(&mut model, Message::Key(key(KeyCode::PageDown)), &ctx);
    if let ActiveView::Describe(ref dv) = model.active_view {
        assert!(dv.scroll > 0, "scroll should advance with PgDn");
    } else {
        panic!("expected Describe view");
    }
    update(&mut model, Message::Key(key(KeyCode::PageUp)), &ctx);
    if let ActiveView::Describe(ref dv) = model.active_view {
        assert_eq!(dv.scroll, 0, "scroll should return to 0 after PgUp");
    } else {
        panic!("expected Describe view");
    }
}

#[test]
fn esc_from_describe_view_returns_to_empty() {
    let graph = make_graph_with_components();
    let dir = fixtures_components_dir();
    let ctx = describe_ctx(&graph, &dir);
    let mut model = Model::new();
    submit_describe(&mut model, &ctx, "button");
    assert!(matches!(model.active_view, ActiveView::Describe(_)));
    update(&mut model, Message::Key(key(KeyCode::Esc)), &ctx);
    assert!(matches!(model.active_view, ActiveView::Empty));
}
