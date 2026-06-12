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
use common::{key, settle, update_ctx, update_ctx_builder};

use crossterm::event::KeyCode;
use design_data_core::graph::{ComponentRecord, TokenGraph};
use design_data_tui::app::{ActiveView, DescribeView};
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
    update_ctx_builder(graph).components_dir(dir.as_path()).build()
}

fn submit_describe(model: &mut Model, ctx: &UpdateCtx<'_>, id: &str) {
    // `describe` completes via a Task (DescribeDone) — use `settle` to run the
    // FS read and settle the view before asserting.
    settle(model, Message::PaletteSubmit(format!("describe {id}")), ctx);
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

// ── g/G scroll ────────────────────────────────────────────────────────────────

/// Build a DescribeView with enough lines to make G scrolling observable.
fn multi_line_describe() -> DescribeView {
    let json = (0..30).map(|i| format!("  \"line{i}\": {i}")).collect::<Vec<_>>().join(",\n");
    DescribeView {
        component: "test".to_string(),
        pretty_json: format!("{{\n{json}\n}}"),
        scroll: 0,
    }
}

#[test]
fn g_key_scrolls_describe_to_top() {
    use design_data_core::graph::TokenGraph;
    let graph = TokenGraph::default();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    model.active_view = ActiveView::Describe(multi_line_describe());
    model.close_palette(); // palette must be closed for view-key routing
    // Advance scroll, then jump back to top.
    update(&mut model, Message::Key(key(KeyCode::PageDown)), &ctx);
    update(&mut model, Message::Key(key(KeyCode::Char('g'))), &ctx);
    if let ActiveView::Describe(ref dv) = model.active_view {
        assert_eq!(dv.scroll, 0, "g should scroll describe to top");
    } else {
        panic!("expected Describe view");
    }
}

#[test]
fn shift_g_key_scrolls_describe_to_bottom() {
    use design_data_core::graph::TokenGraph;
    let graph = TokenGraph::default();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    model.active_view = ActiveView::Describe(multi_line_describe());
    model.close_palette(); // palette must be closed for view-key routing
    update(&mut model, Message::Key(key(KeyCode::Char('G'))), &ctx);
    if let ActiveView::Describe(ref dv) = model.active_view {
        assert!(dv.scroll > 0, "G should scroll describe toward bottom (got scroll={})", dv.scroll);
    } else {
        panic!("expected Describe view");
    }
}
