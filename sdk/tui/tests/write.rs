// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Integration tests for wizard `write_token` integration (M4 of RFC #973).
//!
//! Each test uses a `tempfile::TempDir` as the dataset to keep writes hermetic.
//! Tests that exercise the real `write_token` path load `SchemaRegistry` from
//! `packages/tokens/schemas` (relative to the repo root via `CARGO_MANIFEST_DIR`).

use std::path::PathBuf;

mod common;
use common::{feed_keys, key, type_str, update_ctx_builder};

use crossterm::event::KeyCode;
use design_data_core::graph::{Layer, TokenGraph, TokenRecord};
use design_data_core::query::TokenIndex;
use design_data_core::schema::SchemaRegistry;
use design_data_tui::wizard::{NameField, ValueKind, ValueRow, WizardCtx, WizardState};
use design_data_tui::{update, Message, Model, UpdateCtx};
use serde_json::json;
use tui_input::Input;

/// Valid color schema URL from the real registry.
const COLOR_SCHEMA: &str =
    "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/color.json";

/// Load the real `SchemaRegistry` from the schemas directory.
fn load_registry() -> SchemaRegistry {
    // Walk up from the TUI crate manifest to find packages/tokens/schemas.
    let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let schemas = manifest.join("../../packages/tokens/schemas");
    SchemaRegistry::load_legacy_token_schemas(&schemas).expect("schema registry should load")
}

/// A minimal graph with one color token that has a schema URL.
fn make_graph_with_schema() -> TokenGraph {
    let records: Vec<TokenRecord> = vec![TokenRecord {
        name: "accent-background-color-default".into(),
        file: PathBuf::from("foundation.json"),
        index: 0,
        schema_url: Some(COLOR_SCHEMA.into()),
        uuid: None,
        alias_target: None,
        raw: json!({
            "$schema": COLOR_SCHEMA,
            "value": "#0265DC",
            "name": { "property": "background-color", "variant": "accent" }
        }),
        layer: Layer::Foundation,
    }];
    TokenGraph::from_records(records)
}

/// Build a `WizardState` ready for Screen 4 submission with a Literal color value.
fn wizard_at_confirm_literal(property: &str, value: &str, schema_url: &str) -> WizardState {
    let mut ws = WizardState::new();
    ws.classification.property = Input::from(property.to_string());
    ws.schema_url = Some(schema_url.to_string());
    ws.rationale = Input::from("Test rationale for checkout redesign".to_string());
    ws.values.rows = vec![ValueRow {
        mode_combo: vec![],
        kind: ValueKind::Literal,
        alias_target: Input::default(),
        literal: Input::from(value.to_string()),
    }];
    ws
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[test]
fn submit_without_allow_write_does_not_create_file() {
    let registry = load_registry();
    let graph = make_graph_with_schema();
    let tmpdir = tempfile::TempDir::new().expect("tempdir");
    let ctx = update_ctx_builder(&graph)
        .dataset_path(tmpdir.path())
        .schema_registry(std::sync::Arc::new(registry))
        .build();
    let mut model = Model::new();
    update(
        &mut model,
        Message::PaletteSubmit("new background-color".into()),
        &ctx,
    );

    feed_keys(&mut model, &ctx, &[KeyCode::Enter]); // → Screen 2
    feed_keys(&mut model, &ctx, &[KeyCode::Tab]); // focus property
    type_str(&mut model, &ctx, "background-color");
    feed_keys(&mut model, &ctx, &[KeyCode::Enter]); // → Screen 3
    feed_keys(&mut model, &ctx, &[KeyCode::Enter]); // → Screen 4
    type_str(&mut model, &ctx, "Needed for checkout redesign");
    let task = update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx);

    assert!(
        !model.is_modal_open(),
        "modal should close without --allow-write"
    );
    assert!(
        task.is_cmd(),
        "submit without allow_write should return Task::Cmd (draft clear)"
    );

    let msg = model
        .status_message
        .as_ref()
        .map(|m| m.text.as_str())
        .unwrap_or("");
    assert!(
        msg.contains("allow-write") || msg.contains("preview"),
        "status should mention --allow-write: {msg}"
    );

    let foundation = tmpdir.path().join("foundation.json");
    assert!(
        !foundation.exists(),
        "foundation.json must NOT be created without --allow-write"
    );
}

#[test]
fn write_done_ok_closes_modal_and_clears_draft() {
    let graph = make_graph_with_schema();
    let ctx = UpdateCtx::minimal(&graph);
    let mut model = Model::new();
    // Open the wizard so there is a modal to close.
    update(
        &mut model,
        Message::PaletteSubmit("new background-color".into()),
        &ctx,
    );
    assert!(model.is_modal_open(), "wizard modal should be open");

    let task = update(
        &mut model,
        Message::WriteDone(Ok((
            "background-color".to_string(),
            PathBuf::from("/tmp/foundation.json"),
        ))),
        &ctx,
    );
    assert!(
        !model.is_modal_open(),
        "WriteDone(Ok) should close the wizard modal"
    );
    assert!(
        task.is_cmd(),
        "WriteDone(Ok) should return a Task::Cmd to clear the draft"
    );
    let msg = model
        .status_message
        .as_ref()
        .map(|m| m.text.as_str())
        .unwrap_or("");
    assert!(msg.contains("wrote"), "status should confirm write: {msg}");
    assert!(
        msg.contains("background-color"),
        "confirmation should name the written token: {msg}"
    );
}

#[test]
fn write_done_err_keeps_modal_open() {
    let graph = make_graph_with_schema();
    let ctx = UpdateCtx::minimal(&graph);
    let mut model = Model::new();
    update(
        &mut model,
        Message::PaletteSubmit("new background-color".into()),
        &ctx,
    );
    assert!(model.is_modal_open(), "wizard modal should be open");

    update(
        &mut model,
        Message::WriteDone(Err("disk full".into())),
        &ctx,
    );
    assert!(
        model.is_modal_open(),
        "WriteDone(Err) should keep the wizard open so the error can be corrected"
    );
}

#[test]
fn submit_with_allow_write_creates_token_file() {
    let registry = load_registry();
    let graph = make_graph_with_schema();
    let tmpdir = tempfile::TempDir::new().expect("tempdir");
    let ctx = WizardCtx {
        graph: &graph,
        token_index: TokenIndex::build(&graph),
        dataset_path: Some(tmpdir.path()),
        schema_registry: Some(&registry),
        allow_write: true,
    };

    // Build wizard state directly: property=background-color, literal value.
    let ws = wizard_at_confirm_literal("background-color", "rgb(2, 100, 220)", COLOR_SCHEMA);
    let written_path = ws.perform_write(&ctx).expect("write should succeed");
    // Cascade writer routes to tokens/{property}.tokens.json (Phase B / B5b).
    assert!(
        written_path.ends_with("background-color.tokens.json"),
        "should write to tokens/background-color.tokens.json: {written_path}"
    );

    // tokens/background-color.tokens.json must now exist as a JSON array.
    let cascade_file = tmpdir
        .path()
        .join("tokens")
        .join("background-color.tokens.json");
    assert!(
        cascade_file.exists(),
        "tokens/background-color.tokens.json should be created by write_cascade_token"
    );

    let content =
        std::fs::read_to_string(&cascade_file).expect("read background-color.tokens.json");
    let arr: serde_json::Value =
        serde_json::from_str(&content).expect("parse background-color.tokens.json");
    let tokens = arr.as_array().expect("cascade file should be a JSON array");
    let tok = tokens
        .iter()
        .find(|t| {
            t.get("name")
                .and_then(|n| n.get("property"))
                .and_then(|p| p.as_str())
                == Some("background-color")
        })
        .expect("cascade array should contain the new token");
    assert_eq!(tok["name"]["property"], "background-color");
}

#[test]
fn submit_with_allow_write_includes_name_object() {
    let registry = load_registry();
    let graph = make_graph_with_schema();
    let tmpdir = tempfile::TempDir::new().expect("tempdir");
    let ctx = WizardCtx {
        graph: &graph,
        token_index: TokenIndex::build(&graph),
        dataset_path: Some(tmpdir.path()),
        schema_registry: Some(&registry),
        allow_write: true,
    };

    let mut ws = wizard_at_confirm_literal("background-color", "rgb(2, 100, 220)", COLOR_SCHEMA);
    ws.classification.name_fields = vec![NameField {
        key: "variant".into(),
        value: Input::from("accent".to_string()),
        suggestions: Vec::new(),
    }];

    let written_path = ws.perform_write(&ctx).expect("write should succeed");
    // Cascade writer routes to tokens/{property}.tokens.json (Phase B / B5b).
    assert!(
        written_path.ends_with("background-color.tokens.json"),
        "should write to tokens/background-color.tokens.json: {written_path}"
    );

    let cascade_file = tmpdir
        .path()
        .join("tokens")
        .join("background-color.tokens.json");
    let content =
        std::fs::read_to_string(&cascade_file).expect("read background-color.tokens.json");
    let arr: serde_json::Value =
        serde_json::from_str(&content).expect("parse background-color.tokens.json");
    let tokens = arr.as_array().expect("cascade file should be a JSON array");
    let tok = tokens
        .iter()
        .find(|t| {
            t.get("name")
                .and_then(|n| n.get("variant"))
                .and_then(|v| v.as_str())
                == Some("accent")
        })
        .expect("cascade array should contain the accent token");
    assert_eq!(tok["name"]["property"], "background-color");
    assert_eq!(tok["name"]["variant"], "accent");
}

#[test]
fn submit_with_allow_write_does_not_write_product_context() {
    // The cascade write path (Phase B) does not modify product-context.json —
    // that was a legacy-only concept.  Confirm the file is untouched.
    let registry = load_registry();
    let graph = make_graph_with_schema();
    let tmpdir = tempfile::TempDir::new().expect("tempdir");

    let pc_initial =
        r#"{"specVersion":"1.0.0-draft","layer":"product","extensions":{"tokens":[]}}"#;
    let pc_path = tmpdir.path().join("product-context.json");
    std::fs::write(&pc_path, pc_initial).expect("write product-context.json");

    let ctx = WizardCtx {
        graph: &graph,
        token_index: TokenIndex::build(&graph),
        dataset_path: Some(tmpdir.path()),
        schema_registry: Some(&registry),
        allow_write: true,
    };

    let ws = wizard_at_confirm_literal("background-color", "rgb(10, 20, 30)", COLOR_SCHEMA);
    ws.perform_write(&ctx).expect("write should succeed");

    // product-context.json must be byte-identical to what we seeded.
    let pc_text = std::fs::read_to_string(&pc_path).expect("read product-context.json");
    assert_eq!(
        pc_text, pc_initial,
        "cascade writer must not modify product-context.json"
    );
}

#[test]
fn submit_with_allow_write_missing_schema_returns_error() {
    let registry = load_registry();
    let graph = make_graph_with_schema();
    let tmpdir = tempfile::TempDir::new().expect("tempdir");
    let ctx = WizardCtx {
        graph: &graph,
        token_index: TokenIndex::build(&graph),
        dataset_path: Some(tmpdir.path()),
        schema_registry: Some(&registry),
        allow_write: true,
    };

    // Build wizard with NO schema_url — should fail validation.
    let mut ws = WizardState::new();
    ws.classification.property = Input::from("background-color".to_string());
    ws.schema_url = None; // explicitly no schema
    ws.rationale = Input::from("rationale text".to_string());
    ws.values.rows = vec![ValueRow {
        mode_combo: vec![],
        kind: ValueKind::Literal,
        alias_target: Input::default(),
        literal: Input::from("rgb(1,2,3)".to_string()),
    }];

    let result = ws.perform_write(&ctx);
    assert!(result.is_err(), "perform_write should fail without $schema");
    let err = result.unwrap_err();
    assert!(
        err.contains("$schema") || err.contains("schema"),
        "error should mention $schema: {err}"
    );

    // No files written.
    assert!(
        !tmpdir.path().join("foundation.json").exists(),
        "no file on failure"
    );
}

#[test]
fn is_override_detected_when_token_name_exists_in_graph() {
    let registry = load_registry();
    // Graph already contains a token named "background-color" (assembled from property only).
    let graph = TokenGraph::from_records(vec![TokenRecord {
        name: "background-color".into(), // same as assembled_name with property="background-color"
        file: PathBuf::from("foundation.json"),
        index: 0,
        schema_url: Some(COLOR_SCHEMA.into()),
        uuid: None,
        alias_target: None,
        raw: json!({
            "$schema": COLOR_SCHEMA,
            "value": "#fff",
            "name": { "property": "background-color" }
        }),
        layer: Layer::Foundation,
    }]);

    let mut ws = WizardState::new();
    ws.schema_url = Some(COLOR_SCHEMA.into());
    ws.rationale = tui_input::Input::from("test rationale".to_string());
    ws.classification.property = tui_input::Input::from("background-color".to_string());
    // Literal value row.
    ws.values.rows = vec![design_data_tui::wizard::ValueRow {
        mode_combo: vec![],
        kind: ValueKind::Literal,
        alias_target: tui_input::Input::default(),
        literal: tui_input::Input::from("rgb(255,255,255)".to_string()),
    }];

    let tmpdir = tempfile::TempDir::new().expect("tempdir");
    let ctx = WizardCtx {
        graph: &graph,
        token_index: TokenIndex::build(&graph),
        dataset_path: Some(tmpdir.path()),
        schema_registry: Some(&registry),
        allow_write: true,
    };

    let result = ws.perform_write(&ctx);
    assert!(result.is_ok(), "write should succeed: {:?}", result);

    // Cascade writer upserts by UUID — a token whose name already exists in the
    // graph is written as a new entry (the cascade writer resolves identity by uuid,
    // not name key).  The cascade file should exist and contain the new token.
    let cascade_file = tmpdir
        .path()
        .join("tokens")
        .join("background-color.tokens.json");
    assert!(
        cascade_file.exists(),
        "tokens/background-color.tokens.json should be created"
    );
    let arr: serde_json::Value =
        serde_json::from_str(&std::fs::read_to_string(&cascade_file).unwrap()).unwrap();
    assert!(
        arr.as_array().map_or(false, |a| !a.is_empty()),
        "cascade array should contain the new token"
    );
}

#[test]
fn resolve_target_file_routes_to_cascade_tokens_dir() {
    // Verify cascade target-file resolution: property-based routing to
    // tokens/{property}.tokens.json (Phase B / B5b migration).
    let registry = load_registry();
    let graph = make_graph_with_schema();
    let tmpdir = tempfile::TempDir::new().expect("tempdir");

    let mut ws = WizardState::new();
    ws.schema_url = Some(COLOR_SCHEMA.into());
    ws.rationale = tui_input::Input::from("rationale text".to_string());
    ws.classification.property = tui_input::Input::from("background-color".to_string());
    ws.values.rows = vec![design_data_tui::wizard::ValueRow {
        mode_combo: vec![],
        kind: ValueKind::Literal,
        alias_target: tui_input::Input::default(),
        literal: tui_input::Input::from("rgb(10, 20, 30)".to_string()),
    }];

    let ctx = WizardCtx {
        graph: &graph,
        token_index: TokenIndex::build(&graph),
        dataset_path: Some(tmpdir.path()),
        schema_registry: Some(&registry),
        allow_write: true,
    };

    let written_path = ws.perform_write(&ctx).expect("write should succeed");
    // Phase B: tokens route to tokens/{property}.tokens.json, not the legacy flat files.
    assert!(
        written_path.ends_with("background-color.tokens.json"),
        "tokens should land in tokens/background-color.tokens.json, got: {written_path}"
    );
    // File is a JSON array (cascade format).
    let content = std::fs::read_to_string(
        &tmpdir
            .path()
            .join("tokens")
            .join("background-color.tokens.json"),
    )
    .expect("read cascade file");
    let arr: serde_json::Value = serde_json::from_str(&content).expect("parse cascade file");
    assert!(arr.is_array(), "cascade file must be a JSON array");
}
