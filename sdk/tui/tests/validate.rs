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
use design_data_core::graph::TokenGraph;
use design_data_core::query::TokenIndex;
use design_data_core::schema::SchemaRegistry;
use design_data_tui::app::ActiveView;
use design_data_tui::{dispatch, update, Message, Model, UpdateCtx};
use std::path::PathBuf;
use std::sync::Arc;

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

fn try_load_registry() -> Option<SchemaRegistry> {
    let dir = schema_dir();
    if !dir.join("token-types").is_dir() {
        return None;
    }
    SchemaRegistry::load_legacy_token_schemas(&dir).ok()
}

fn validate_ctx<'a>(
    graph: &'a TokenGraph,
    dataset_path: &'a std::path::Path,
    registry: Arc<SchemaRegistry>,
) -> UpdateCtx<'a> {
    UpdateCtx {
        graph,
        dataset_path: Some(dataset_path),
        components_dir: None,
        schema_registry: Some(registry),
        mode_sets_dir: None,
        token_index: TokenIndex::build(graph),
        mode_set_restrictions: std::collections::HashMap::new(),
        allow_write: false,
    }
}

fn submit_validate(model: &mut Model, ctx: &UpdateCtx<'_>) {
    // `validate` now completes via a Task (ValidateDone), so drive it through
    // `dispatch` to run the FS scan and settle the view before asserting.
    dispatch(model, Message::PaletteSubmit("validate".into()), ctx);
}

#[test]
fn validate_without_registry_sets_error_status() {
    let graph = TokenGraph::default();
    let tokens_dir = tokens_good_dir();
    let ctx = UpdateCtx {
        graph: &graph,
        dataset_path: Some(&tokens_dir),
        components_dir: None,
        schema_registry: None,
        mode_sets_dir: None,
        token_index: TokenIndex::build(&graph),
        mode_set_restrictions: std::collections::HashMap::new(),
        allow_write: false,
    };
    let mut model = Model::new();
    update(&mut model, Message::PaletteSubmit("validate".into()), &ctx);
    assert!(matches!(model.active_view, ActiveView::Empty));
    let msg = model
        .status_message
        .as_ref()
        .map(|m| m.text.as_str())
        .unwrap_or("");
    assert!(
        msg.contains("requires") || msg.contains("error"),
        "expected error: {msg}"
    );
}

#[test]
fn validate_good_tokens_produces_validate_view() {
    let Some(registry) = try_load_registry() else {
        return;
    };
    let tokens_dir = tokens_good_dir();
    let graph = TokenGraph::from_json_dir(&tokens_dir).expect("graph load");
    let ctx = validate_ctx(&graph, &tokens_dir, Arc::new(registry));
    let mut model = Model::new();
    submit_validate(&mut model, &ctx);
    assert!(
        matches!(model.active_view, ActiveView::Validate(_)),
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
    let ctx = validate_ctx(&graph, &tokens_dir, Arc::new(registry));
    let mut model = Model::new();
    submit_validate(&mut model, &ctx);
    if let ActiveView::Validate(ref vv) = model.active_view {
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
    let ctx = validate_ctx(&graph, &tokens_dir, Arc::new(registry));
    let mut model = Model::new();
    submit_validate(&mut model, &ctx);
    if let ActiveView::Validate(ref vv) = model.active_view {
        assert!(
            vv.rows.len() >= 1,
            "expected at least 1 finding for bad tokens"
        );
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
    let ctx = validate_ctx(&graph, &tokens_dir, Arc::new(registry));
    let mut model = Model::new();
    submit_validate(&mut model, &ctx);
    if let ActiveView::Validate(ref vv) = model.active_view {
        if vv.rows.is_empty() {
            return;
        }
    }
    update(&mut model, Message::Key(key(KeyCode::Char('j'))), &ctx);
    if let ActiveView::Validate(ref vv) = model.active_view {
        if vv.rows.len() > 1 {
            assert_eq!(vv.table_state.selected(), Some(1));
        }
    }
    update(&mut model, Message::Key(key(KeyCode::Char('k'))), &ctx);
    if let ActiveView::Validate(ref vv) = model.active_view {
        assert_eq!(vv.table_state.selected(), Some(0));
    }
}

#[test]
fn validate_y_returns_clipboard_task() {
    let Some(registry) = try_load_registry() else {
        return;
    };
    let tokens_dir = tokens_bad_dir();
    let graph = TokenGraph::from_json_dir(&tokens_dir).expect("graph load");
    let ctx = validate_ctx(&graph, &tokens_dir, Arc::new(registry));
    let mut model = Model::new();
    submit_validate(&mut model, &ctx);
    if let ActiveView::Validate(ref vv) = model.active_view {
        if vv.rows.is_empty() {
            return;
        }
    }
    let task = update(&mut model, Message::Key(key(KeyCode::Char('y'))), &ctx);
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
fn esc_from_validate_view_returns_to_empty() {
    let Some(registry) = try_load_registry() else {
        return;
    };
    let tokens_dir = tokens_good_dir();
    let graph = TokenGraph::from_json_dir(&tokens_dir).expect("graph load");
    let ctx = validate_ctx(&graph, &tokens_dir, Arc::new(registry));
    let mut model = Model::new();
    submit_validate(&mut model, &ctx);
    assert!(matches!(model.active_view, ActiveView::Validate(_)));
    update(&mut model, Message::Key(key(KeyCode::Esc)), &ctx);
    assert!(matches!(model.active_view, ActiveView::Empty));
}
