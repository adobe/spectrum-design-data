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
use design_data_tui::app::{App, Modal, SubmitContext};
use design_data_tui::naming::{NamingEvent, NamingScreen, NamingWizardState};
use serde_json::json;
use std::path::PathBuf;

fn key(code: KeyCode) -> KeyEvent {
    KeyEvent::new(code, KeyModifiers::NONE)
}

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
    ];
    TokenGraph::from_records(records)
}

// ── NamingWizardState unit tests ─────────────────────────────────────────────

#[test]
fn assembled_name_joins_property_and_name_fields() {
    let graph = make_graph();
    let mut ns = NamingWizardState::new();
    ns.screen = NamingScreen::Classification;
    // Tab to move focus to property field (focused_field 0→1).
    ns.handle_key(key(KeyCode::Tab), &graph);
    for c in "background-color".chars() {
        ns.handle_key(key(KeyCode::Char(c)), &graph);
    }
    assert_eq!(ns.assembled_name(), "background-color");
}

#[test]
fn new_with_intent_seeds_intent_field() {
    let ns = NamingWizardState::new_with_intent("accent background color");
    assert_eq!(ns.intent.value(), "accent background color");
    assert_eq!(ns.screen, NamingScreen::Intent);
}

#[test]
fn enter_on_intent_screen_advances_to_classification() {
    let graph = make_graph();
    let mut ns = NamingWizardState::new_with_intent("background color");
    ns.refresh_suggestions(&graph);
    let event = ns.handle_key(key(KeyCode::Enter), &graph);
    assert!(matches!(event, NamingEvent::Continue));
    assert_eq!(ns.screen, NamingScreen::Classification);
}

#[test]
fn enter_on_classification_screen_advances_to_result() {
    let graph = make_graph();
    let mut ns = NamingWizardState::new();
    ns.screen = NamingScreen::Classification;
    let event = ns.handle_key(key(KeyCode::Enter), &graph);
    assert!(matches!(event, NamingEvent::Continue));
    assert_eq!(ns.screen, NamingScreen::Result);
}

#[test]
fn c_on_result_screen_returns_copy_event() {
    let graph = make_graph();
    let mut ns = NamingWizardState::new();
    ns.screen = NamingScreen::Classification;
    // Tab to property field, then type.
    ns.handle_key(key(KeyCode::Tab), &graph);
    for c in "color".chars() {
        ns.handle_key(key(KeyCode::Char(c)), &graph);
    }
    ns.handle_key(key(KeyCode::Enter), &graph); // advance to Result
    assert_eq!(ns.screen, NamingScreen::Result);

    let event = ns.handle_key(key(KeyCode::Char('c')), &graph);
    assert!(matches!(event, NamingEvent::Copy(ref name) if name == "color"));
}

#[test]
fn e_on_result_screen_goes_back_to_classification() {
    let graph = make_graph();
    let mut ns = NamingWizardState::new();
    ns.screen = NamingScreen::Result;
    let event = ns.handle_key(key(KeyCode::Char('e')), &graph);
    assert!(matches!(event, NamingEvent::Continue));
    assert_eq!(ns.screen, NamingScreen::Classification);
}

#[test]
fn esc_on_any_screen_cancels() {
    let graph = make_graph();
    for start_screen in [NamingScreen::Intent, NamingScreen::Classification, NamingScreen::Result] {
        let mut ns = NamingWizardState::new();
        ns.screen = start_screen;
        let event = ns.handle_key(key(KeyCode::Esc), &graph);
        assert!(matches!(event, NamingEvent::Cancel));
    }
}

#[test]
fn q_on_result_screen_cancels() {
    let graph = make_graph();
    let mut ns = NamingWizardState::new();
    ns.screen = NamingScreen::Result;
    let event = ns.handle_key(key(KeyCode::Char('q')), &graph);
    assert!(matches!(event, NamingEvent::Cancel));
}

#[test]
fn layer_cycles_with_arrow_keys_on_classification() {
    let graph = make_graph();
    let mut ns = NamingWizardState::new();
    ns.screen = NamingScreen::Classification;
    // focused_field == 0 (layer), right cycles forward Foundation → Platform.
    ns.handle_key(key(KeyCode::Right), &graph);
    assert_eq!(ns.classification.layer, Layer::Platform);
    ns.handle_key(key(KeyCode::Left), &graph);
    assert_eq!(ns.classification.layer, Layer::Foundation);
}

// ── App-level integration tests ───────────────────────────────────────────────

fn submit(app: &mut App, graph: &TokenGraph, cmd: &str) {
    let ctx = SubmitContext::new(graph);
    let chars: Vec<char> = cmd.chars().collect();
    for c in chars {
        app.handle_key(key(KeyCode::Char(c)));
    }
    app.handle_key(key(KeyCode::Enter));
    app.submit_palette(&ctx);
}

fn open_palette_cmd(app: &mut App) {
    app.handle_key(key(KeyCode::Char(':')));
}

#[test]
fn name_command_opens_naming_modal() {
    let graph = make_graph();
    let mut app = App::new();
    open_palette_cmd(&mut app);
    submit(&mut app, &graph, "name accent background");
    assert!(matches!(app.modal, Some(Modal::Naming(_))));
}

#[test]
fn name_command_no_args_opens_naming_modal() {
    let graph = make_graph();
    let mut app = App::new();
    open_palette_cmd(&mut app);
    submit(&mut app, &graph, "name");
    assert!(matches!(app.modal, Some(Modal::Naming(_))));
}

#[test]
fn name_command_seeds_intent_from_args() {
    let graph = make_graph();
    let mut app = App::new();
    open_palette_cmd(&mut app);
    submit(&mut app, &graph, "name accent background");
    if let Some(Modal::Naming(ref ns)) = app.modal {
        assert_eq!(ns.intent.value(), "accent background");
    } else {
        panic!("expected Naming modal");
    }
}

#[test]
fn tab_autocompletes_name_command() {
    let mut app = App::new();
    open_palette_cmd(&mut app);
    // "na" is unambiguous — "name" is the only command with that prefix.
    app.handle_key(key(KeyCode::Char('n')));
    app.handle_key(key(KeyCode::Char('a')));
    app.handle_key(key(KeyCode::Tab));
    assert_eq!(app.palette_input.value(), "name ");
}

#[test]
fn copy_event_sets_pending_yank_and_status() {
    use design_data_tui::wizard::WizardCtx;

    let graph = make_graph();
    let mut app = App::new();
    open_palette_cmd(&mut app);
    submit(&mut app, &graph, "name");

    // Drive to result screen with a property typed.
    let ctx = WizardCtx { graph: &graph, dataset_path: None, schema_registry: None, allow_write: false };

    // Enter on intent screen → Classification.
    app.handle_modal_key(key(KeyCode::Enter), &ctx);
    // On Classification: Tab to property field, type "color", then Enter → Result.
    app.handle_modal_key(key(KeyCode::Tab), &ctx);
    for c in "color".chars() {
        app.handle_modal_key(key(KeyCode::Char(c)), &ctx);
    }
    app.handle_modal_key(key(KeyCode::Enter), &ctx);
    // On Result: press 'c' → Copy.
    app.handle_modal_key(key(KeyCode::Char('c')), &ctx);

    assert_eq!(app.pending_yank.as_deref(), Some("color"));
    let msg = app.status_message.as_ref().map(|m| m.text.as_str()).unwrap_or("");
    assert!(msg.contains("copied"), "expected 'copied' in status: {msg}");
    // Copy does NOT close the modal — user stays on Result to copy again or keep inspecting.
    assert!(app.modal.is_some(), "Copy should not close the Naming modal");
}

#[test]
fn y_key_on_result_screen_also_copies() {
    let graph = make_graph();
    let mut ns = NamingWizardState::new();
    ns.screen = NamingScreen::Classification;
    // Tab to property field, type "color", advance to Result.
    ns.handle_key(key(KeyCode::Tab), &graph);
    for c in "color".chars() {
        ns.handle_key(key(KeyCode::Char(c)), &graph);
    }
    ns.handle_key(key(KeyCode::Enter), &graph);
    assert_eq!(ns.screen, NamingScreen::Result);

    let event = ns.handle_key(key(KeyCode::Char('y')), &graph);
    assert!(matches!(event, NamingEvent::Copy(ref name) if name == "color"));
}

#[test]
fn esc_in_naming_modal_closes_it() {
    use design_data_tui::wizard::WizardCtx;

    let graph = make_graph();
    let mut app = App::new();
    open_palette_cmd(&mut app);
    submit(&mut app, &graph, "name");

    let ctx = WizardCtx { graph: &graph, dataset_path: None, schema_registry: None, allow_write: false };
    app.handle_modal_key(key(KeyCode::Esc), &ctx);
    assert!(app.modal.is_none());
}
