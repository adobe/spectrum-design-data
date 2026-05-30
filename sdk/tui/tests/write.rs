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

use std::collections::HashMap;
use std::path::PathBuf;

mod common;
use common::key;

use crossterm::event::KeyCode;
use design_data_core::graph::{Layer, TokenGraph, TokenRecord};
use design_data_core::query::TokenIndex;
use design_data_core::schema::SchemaRegistry;
use design_data_tui::wizard::{ValueKind, ValueRow, WizardCtx, WizardState};
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
    let ctx = UpdateCtx {
        graph: &graph,
        token_index: TokenIndex::build(&graph),
        dataset_path: Some(tmpdir.path()),
        schema_registry: Some(&registry),
        components_dir: None,
        mode_sets_dir: None,
        mode_set_restrictions: HashMap::new(),
        allow_write: false,
    };
    let mut model = Model::new();
    update(
        &mut model,
        Message::PaletteSubmit("new background-color".into()),
        &ctx,
    );

    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx); // → Screen 2
    update(&mut model, Message::Key(key(KeyCode::Tab)), &ctx); // focus property
    for c in "background-color".chars() {
        update(&mut model, Message::Key(key(KeyCode::Char(c))), &ctx);
    }
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx); // → Screen 3
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx); // → Screen 4
    for c in "Needed for checkout redesign".chars() {
        update(&mut model, Message::Key(key(KeyCode::Char(c))), &ctx);
    }
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
    assert!(
        written_path.ends_with("foundation.json"),
        "should write to foundation.json: {written_path}"
    );

    // foundation.json must now exist and contain the new key.
    let foundation = tmpdir.path().join("foundation.json");
    assert!(
        foundation.exists(),
        "foundation.json should be created by write_token"
    );

    let content = std::fs::read_to_string(&foundation).expect("read foundation.json");
    let doc: serde_json::Value = serde_json::from_str(&content).expect("parse foundation.json");
    assert!(
        doc.get("background-color").is_some(),
        "foundation.json should contain the new token key: {content}"
    );
}

#[test]
fn submit_with_allow_write_updates_product_context() {
    let registry = load_registry();
    let graph = make_graph_with_schema();
    let tmpdir = tempfile::TempDir::new().expect("tempdir");

    // Seed an empty product-context.json so write_token will update it.
    let pc_path = tmpdir.path().join("product-context.json");
    std::fs::write(
        &pc_path,
        r#"{"specVersion":"1.0.0-draft","layer":"product","extensions":{"tokens":[]}}"#,
    )
    .expect("write product-context.json");

    let ctx = WizardCtx {
        graph: &graph,
        token_index: TokenIndex::build(&graph),
        dataset_path: Some(tmpdir.path()),
        schema_registry: Some(&registry),
        allow_write: true,
    };

    let ws = wizard_at_confirm_literal("background-color", "rgb(10, 20, 30)", COLOR_SCHEMA);
    ws.perform_write(&ctx).expect("write should succeed");

    let pc_text = std::fs::read_to_string(&pc_path).expect("read product-context.json");
    let pc: serde_json::Value = serde_json::from_str(&pc_text).expect("parse product-context.json");
    let tokens = pc
        .get("extensions")
        .and_then(|e| e.get("tokens"))
        .and_then(|t| t.as_array())
        .expect("extensions.tokens array");
    assert!(
        !tokens.is_empty(),
        "product-context.json should have an entry after write"
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

    // The token should have been written (is_override=true writes to the same file).
    let foundation = tmpdir.path().join("foundation.json");
    assert!(foundation.exists(), "foundation.json should be created");
    let doc: serde_json::Value =
        serde_json::from_str(&std::fs::read_to_string(&foundation).unwrap()).unwrap();
    assert!(
        doc.get("background-color").is_some(),
        "token key should be present"
    );
}

#[test]
fn resolve_target_file_foundation_maps_to_foundation_json() {
    // Verify target-file resolution by inspecting where perform_write lands the output.
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
    assert!(
        written_path.ends_with("foundation.json"),
        "Foundation layer tokens should land in foundation.json, got: {written_path}"
    );
}
