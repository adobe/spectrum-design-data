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
use common::{key, make_graph_with_tokens, update_ctx};

use crossterm::event::KeyCode;
use design_data_core::graph::{Layer, TokenGraph};
use design_data_tui::app::Modal;
use design_data_tui::naming::{NamingEvent, NamingScreen, NamingWizardState};
use design_data_tui::{update, Message, Model, UpdateCtx};

fn make_graph() -> TokenGraph {
    make_graph_with_tokens(&["accent-background-color-default"])
}

// ── NamingWizardState unit tests (test naming module directly, no App/update) ─

#[test]
fn assembled_name_joins_property_and_name_fields() {
    let graph = make_graph();
    let mut ns = NamingWizardState::new();
    ns.screen = NamingScreen::Classification;
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
    ns.handle_key(key(KeyCode::Tab), &graph);
    for c in "color".chars() {
        ns.handle_key(key(KeyCode::Char(c)), &graph);
    }
    ns.handle_key(key(KeyCode::Enter), &graph);
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
    for start_screen in [
        NamingScreen::Intent,
        NamingScreen::Classification,
        NamingScreen::Result,
    ] {
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
    ns.handle_key(key(KeyCode::Right), &graph);
    assert_eq!(ns.classification.layer, Layer::Platform);
    ns.handle_key(key(KeyCode::Left), &graph);
    assert_eq!(ns.classification.layer, Layer::Foundation);
}

#[test]
fn y_key_on_result_screen_also_copies() {
    let graph = make_graph();
    let mut ns = NamingWizardState::new();
    ns.screen = NamingScreen::Classification;
    ns.handle_key(key(KeyCode::Tab), &graph);
    for c in "color".chars() {
        ns.handle_key(key(KeyCode::Char(c)), &graph);
    }
    ns.handle_key(key(KeyCode::Enter), &graph);
    assert_eq!(ns.screen, NamingScreen::Result);
    let event = ns.handle_key(key(KeyCode::Char('y')), &graph);
    assert!(matches!(event, NamingEvent::Copy(ref name) if name == "color"));
}

// ── App-level integration tests (migrated to Model + update) ─────────────────

fn submit(model: &mut Model, ctx: &UpdateCtx<'_>, cmd: &str) {
    update(model, Message::PaletteSubmit(cmd.into()), ctx);
}

#[test]
fn name_command_opens_naming_modal() {
    let graph = make_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    submit(&mut model, &ctx, "name accent background");
    assert!(matches!(model.modal(), Some(Modal::Naming(_))));
}

#[test]
fn name_command_no_args_opens_naming_modal() {
    let graph = make_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    submit(&mut model, &ctx, "name");
    assert!(matches!(model.modal(), Some(Modal::Naming(_))));
}

#[test]
fn name_command_seeds_intent_from_args() {
    let graph = make_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    submit(&mut model, &ctx, "name accent background");
    if let Some(Modal::Naming(ref ns)) = model.modal() {
        assert_eq!(ns.intent.value(), "accent background");
    } else {
        panic!("expected Naming modal");
    }
}

#[test]
fn tab_autocompletes_name_command() {
    let graph = make_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Char(':'))), &ctx);
    for c in "na".chars() {
        update(&mut model, Message::Key(key(KeyCode::Char(c))), &ctx);
    }
    update(&mut model, Message::Key(key(KeyCode::Tab)), &ctx);
    assert_eq!(model.palette_input_value(), "name ");
}

#[test]
fn copy_event_sets_pending_yank_and_status() {
    let graph = make_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    submit(&mut model, &ctx, "name");

    // Enter on intent screen → Classification.
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx);
    // Tab to property field, type "color", Enter → Result.
    update(&mut model, Message::Key(key(KeyCode::Tab)), &ctx);
    for c in "color".chars() {
        update(&mut model, Message::Key(key(KeyCode::Char(c))), &ctx);
    }
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx);
    // Press 'c' → Copy; should return Task::Cmd (clipboard write) instead of setting pending_yank.
    let task = update(&mut model, Message::Key(key(KeyCode::Char('c'))), &ctx);

    assert!(
        task.is_cmd(),
        "Copy should return Task::Cmd for clipboard write"
    );
    assert!(
        model.pending_yank.is_none(),
        "pending_yank should not be set — clipboard is via Task::Cmd"
    );
    let msg = model
        .status_message
        .as_ref()
        .map(|m| m.text.as_str())
        .unwrap_or("");
    assert!(msg.contains("copied"), "expected 'copied' in status: {msg}");
    assert!(
        model.is_modal_open(),
        "Copy should not close the Naming modal"
    );
}

#[test]
fn esc_in_naming_modal_closes_it() {
    let graph = make_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    submit(&mut model, &ctx, "name");
    assert!(model.is_modal_open());
    update(&mut model, Message::Key(key(KeyCode::Esc)), &ctx);
    assert!(!model.is_modal_open());
}
