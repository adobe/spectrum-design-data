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
use design_data_tui::app::{App, Modal, SubmitContext};
use design_data_tui::wizard::{ValueKind, WizardCtx, WizardPath, WizardScreen};
use serde_json::json;
use std::path::PathBuf;

fn key(code: KeyCode) -> KeyEvent {
    KeyEvent::new(code, KeyModifiers::NONE)
}

/// Simple graph with a few color tokens.
fn make_graph() -> TokenGraph {
    let records: Vec<TokenRecord> = vec![
        TokenRecord {
            name: "accent-background-color-default".into(),
            file: PathBuf::from("tokens.json"),
            index: 0,
            schema_url: None,
            uuid: None,
            alias_target: None,
            raw: json!({
                "value": "#0265DC",
                "name": { "property": "background-color", "variant": "accent" }
            }),
            layer: Layer::Foundation,
        },
        TokenRecord {
            name: "neutral-background-color-default".into(),
            file: PathBuf::from("tokens.json"),
            index: 1,
            schema_url: None,
            uuid: None,
            alias_target: None,
            raw: json!({
                "value": "#F5F5F5",
                "name": { "property": "background-color", "variant": "neutral" }
            }),
            layer: Layer::Foundation,
        },
    ];
    TokenGraph::from_records(records)
}

/// Graph with a colorScheme mode set — used for Screen 3 tests.
fn make_graph_with_modes() -> TokenGraph {
    let ms = ModeSetRecord {
        file: PathBuf::from("mode-sets/color-scheme.json"),
        name: "colorScheme".into(),
        modes: vec!["light".into(), "dark".into()],
        default_mode: "light".into(),
    };
    make_graph().with_mode_sets(vec![ms])
}

/// Open the wizard via `:new <intent>`.
fn open_wizard(app: &mut App, graph: &TokenGraph, intent: &str) {
    let cmd = format!("new {intent}");
    app.handle_key(key(KeyCode::Char(':')));
    for c in cmd.chars() {
        app.handle_key(key(KeyCode::Char(c)));
    }
    app.submit_palette(&SubmitContext::new(graph));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[test]
fn new_command_opens_wizard() {
    let graph = make_graph();
    let mut app = App::new();
    open_wizard(&mut app, &graph, "accent background");
    assert!(app.modal.is_some(), "modal should be open after :new");
}

#[test]
fn esc_cancels_wizard() {
    let graph = make_graph();
    let mut app = App::new();
    open_wizard(&mut app, &graph, "accent background");
    let ctx = WizardCtx { graph: &graph, dataset_path: None };
    app.handle_modal_key(key(KeyCode::Esc), &ctx);
    assert!(app.modal.is_none(), "modal should close on Esc");
    let msg = app.status_message.as_ref().map(|m| m.text.as_str()).unwrap_or("");
    assert!(msg.contains("cancelled"), "status should say cancelled: {msg}");
}

#[test]
fn intent_populates_suggestions_on_open() {
    let graph = make_graph();
    let mut app = App::new();
    open_wizard(&mut app, &graph, "accent background");
    if let Some(Modal::Wizard(ref ws)) = app.modal {
        assert!(
            !ws.suggestions.is_empty(),
            "suggestions should be populated from intent"
        );
    } else {
        panic!("expected wizard modal");
    }
}

#[test]
fn enter_on_screen_1_advances_to_screen_2() {
    let graph = make_graph();
    let mut app = App::new();
    open_wizard(&mut app, &graph, "accent background");
    let ctx = WizardCtx { graph: &graph, dataset_path: None };
    app.handle_modal_key(key(KeyCode::Enter), &ctx);
    if let Some(Modal::Wizard(ref ws)) = app.modal {
        assert_eq!(ws.screen, WizardScreen::Classification, "should advance to Screen 2");
    } else {
        panic!("expected wizard modal after Enter on Screen 1");
    }
}

#[test]
fn tab_with_suggestion_sets_alias_path_and_jumps_to_confirm() {
    let graph = make_graph();
    let mut app = App::new();
    open_wizard(&mut app, &graph, "accent background");
    let ctx = WizardCtx { graph: &graph, dataset_path: None };
    // Tab should reuse the top suggestion and skip to Screen 4.
    app.handle_modal_key(key(KeyCode::Tab), &ctx);
    if let Some(Modal::Wizard(ref ws)) = app.modal {
        assert_eq!(ws.screen, WizardScreen::Confirm, "should jump to Confirm after Tab reuse");
        assert!(
            matches!(ws.chosen_path, WizardPath::AliasToExisting(_)),
            "chosen_path should be AliasToExisting"
        );
    } else {
        panic!("expected wizard modal after Tab");
    }
}

#[test]
fn screen_2_layer_cycles_with_arrow_keys() {
    let graph = make_graph();
    let mut app = App::new();
    open_wizard(&mut app, &graph, "background");
    let ctx = WizardCtx { graph: &graph, dataset_path: None };
    // Advance to Screen 2.
    app.handle_modal_key(key(KeyCode::Enter), &ctx);
    // focused_field = 0 (layer); Right cycles forward.
    app.handle_modal_key(key(KeyCode::Right), &ctx);
    if let Some(Modal::Wizard(ref ws)) = app.modal {
        assert_eq!(ws.classification.layer, Layer::Platform, "Right should advance layer");
    } else {
        panic!("expected wizard modal");
    }
    // Left cycles back.
    app.handle_modal_key(key(KeyCode::Left), &ctx);
    if let Some(Modal::Wizard(ref ws)) = app.modal {
        assert_eq!(ws.classification.layer, Layer::Foundation, "Left should reverse layer");
    }
}

#[test]
fn screen_2_enter_advances_to_screen_3() {
    let graph = make_graph();
    let mut app = App::new();
    open_wizard(&mut app, &graph, "background");
    let ctx = WizardCtx { graph: &graph, dataset_path: None };
    app.handle_modal_key(key(KeyCode::Enter), &ctx); // → Screen 2
    app.handle_modal_key(key(KeyCode::Enter), &ctx); // → Screen 3
    if let Some(Modal::Wizard(ref ws)) = app.modal {
        assert_eq!(ws.screen, WizardScreen::Values, "should advance to Screen 3");
    } else {
        panic!("expected wizard modal");
    }
}

#[test]
fn screen_3_mode_rows_match_cartesian_product() {
    let graph = make_graph_with_modes();
    let mut app = App::new();
    open_wizard(&mut app, &graph, "background");
    let ctx = WizardCtx { graph: &graph, dataset_path: None };
    app.handle_modal_key(key(KeyCode::Enter), &ctx); // → Screen 2
    app.handle_modal_key(key(KeyCode::Enter), &ctx); // → Screen 3
    if let Some(Modal::Wizard(ref ws)) = app.modal {
        // colorScheme has 2 modes → 2 rows.
        assert_eq!(ws.values.rows.len(), 2, "should have one row per mode combo");
    } else {
        panic!("expected wizard modal");
    }
}

#[test]
fn screen_3_a_l_toggle_value_kind() {
    let graph = make_graph_with_modes();
    let mut app = App::new();
    open_wizard(&mut app, &graph, "background");
    let ctx = WizardCtx { graph: &graph, dataset_path: None };
    app.handle_modal_key(key(KeyCode::Enter), &ctx); // → Screen 2
    app.handle_modal_key(key(KeyCode::Enter), &ctx); // → Screen 3
    // Default is Alias; 'l' should switch to Literal.
    app.handle_modal_key(key(KeyCode::Char('l')), &ctx);
    if let Some(Modal::Wizard(ref ws)) = app.modal {
        assert_eq!(ws.values.rows[0].kind, ValueKind::Literal, "'l' should set Literal");
    }
    // 'a' should switch back.
    app.handle_modal_key(key(KeyCode::Char('a')), &ctx);
    if let Some(Modal::Wizard(ref ws)) = app.modal {
        assert_eq!(ws.values.rows[0].kind, ValueKind::Alias, "'a' should restore Alias");
    }
}

#[test]
fn screen_3_enter_advances_to_screen_4() {
    let graph = make_graph();
    let mut app = App::new();
    let fixtures = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures");
    let ctx = WizardCtx { graph: &graph, dataset_path: Some(&fixtures) };
    open_wizard(&mut app, &graph, "background");
    app.handle_modal_key(key(KeyCode::Enter), &ctx); // → Screen 2
    app.handle_modal_key(key(KeyCode::Enter), &ctx); // → Screen 3
    app.handle_modal_key(key(KeyCode::Enter), &ctx); // → Screen 4
    if let Some(Modal::Wizard(ref ws)) = app.modal {
        assert_eq!(ws.screen, WizardScreen::Confirm, "should advance to Screen 4");
    } else {
        panic!("expected wizard modal");
    }
}

#[test]
fn screen_4_empty_rationale_blocks_submit() {
    let graph = make_graph();
    let mut app = App::new();
    let fixtures = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures");
    let ctx = WizardCtx { graph: &graph, dataset_path: Some(&fixtures) };
    open_wizard(&mut app, &graph, "background");
    app.handle_modal_key(key(KeyCode::Enter), &ctx); // → Screen 2
    app.handle_modal_key(key(KeyCode::Enter), &ctx); // → Screen 3
    app.handle_modal_key(key(KeyCode::Enter), &ctx); // → Screen 4
    // Rationale is empty; Enter should NOT close the modal.
    app.handle_modal_key(key(KeyCode::Enter), &ctx);
    assert!(app.modal.is_some(), "modal should stay open when rationale is empty");
}

#[test]
fn screen_4_diff_preview_is_populated_on_enter() {
    let graph = make_graph();
    let mut app = App::new();
    let fixtures = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures");
    let ctx = WizardCtx { graph: &graph, dataset_path: Some(&fixtures) };
    open_wizard(&mut app, &graph, "background");
    app.handle_modal_key(key(KeyCode::Enter), &ctx); // → Screen 2
    // Tab once: layer (0) → property (1).
    app.handle_modal_key(key(KeyCode::Tab), &ctx);
    for c in "background-color".chars() {
        app.handle_modal_key(key(KeyCode::Char(c)), &ctx);
    }
    app.handle_modal_key(key(KeyCode::Enter), &ctx); // → Screen 3
    app.handle_modal_key(key(KeyCode::Enter), &ctx); // → Screen 4 (triggers build_diff)
    if let Some(Modal::Wizard(ref ws)) = app.modal {
        assert_eq!(ws.screen, WizardScreen::Confirm);
        let diff = ws.diff_preview.as_ref().expect("diff_preview should be populated");
        assert!(diff.contains('+'), "diff should contain '+' lines for the new token");
    } else {
        panic!("expected wizard modal");
    }
}

#[test]
fn screen_4_submit_closes_modal_and_sets_status() {
    let graph = make_graph();
    let mut app = App::new();
    let fixtures = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures");
    let ctx = WizardCtx { graph: &graph, dataset_path: Some(&fixtures) };
    open_wizard(&mut app, &graph, "background");
    app.handle_modal_key(key(KeyCode::Enter), &ctx); // → Screen 2
    app.handle_modal_key(key(KeyCode::Enter), &ctx); // → Screen 3
    app.handle_modal_key(key(KeyCode::Enter), &ctx); // → Screen 4
    // Type a rationale.
    for c in "Needed for the checkout redesign".chars() {
        app.handle_modal_key(key(KeyCode::Char(c)), &ctx);
    }
    // Submit.
    app.handle_modal_key(key(KeyCode::Enter), &ctx);
    assert!(app.modal.is_none(), "modal should close after submit");
    let msg = app.status_message.as_ref().map(|m| m.text.as_str()).unwrap_or("");
    assert!(
        msg.contains("write disabled") || msg.contains("preview"),
        "status should mention preview/write disabled: {msg}"
    );
}

#[test]
fn submit_does_not_create_tokens_json_in_dataset() {
    let graph = make_graph();
    let mut app = App::new();
    // Use a fresh tempdir so there's no pre-existing tokens.json to confuse us.
    let tmpdir = tempfile::TempDir::new().expect("tempdir");
    let tokens_file = tmpdir.path().join("tokens.json");
    let ctx = WizardCtx { graph: &graph, dataset_path: Some(tmpdir.path()) };
    open_wizard(&mut app, &graph, "background");
    app.handle_modal_key(key(KeyCode::Enter), &ctx);
    app.handle_modal_key(key(KeyCode::Enter), &ctx);
    app.handle_modal_key(key(KeyCode::Enter), &ctx);
    for c in "Rationale text here".chars() {
        app.handle_modal_key(key(KeyCode::Char(c)), &ctx);
    }
    app.handle_modal_key(key(KeyCode::Enter), &ctx);
    assert!(
        !tokens_file.exists(),
        "M3 wizard submit must NOT write tokens.json to the dataset"
    );
}

#[test]
fn assembled_name_joins_property_and_fields() {
    use design_data_tui::wizard::WizardState;
    let mut ws = WizardState::new();
    // Set property via Classification input.
    use tui_input::Input;
    ws.classification.property = Input::from("background-color".to_string());
    ws.classification.name_fields.push(design_data_tui::wizard::NameField {
        key: "variant".into(),
        value: Input::from("hover".to_string()),
    });
    assert_eq!(ws.assembled_name(), "background-color-hover");
}
