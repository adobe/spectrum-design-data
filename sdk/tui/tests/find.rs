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
use common::{key, update_ctx};

use crossterm::event::KeyCode;
use design_data_core::graph::{Layer, TokenGraph, TokenRecord};
use design_data_core::query::TokenIndex;
use design_data_tui::app::{ActiveView, Modal};
use design_data_tui::find::{FindEvent, FindScreen, FindWizardState};
use design_data_tui::{update, Message, Model, UpdateCtx};
use serde_json::json;
use std::path::PathBuf;

fn make_find_graph() -> TokenGraph {
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
                "value": "#FFFFFF",
                "name": { "property": "background-color", "variant": "neutral" }
            }),
            layer: Layer::Foundation,
        },
        TokenRecord {
            name: "button-accent-color".into(),
            file: PathBuf::from("tokens.json"),
            index: 2,
            schema_url: None,
            uuid: None,
            alias_target: None,
            raw: json!({
                "value": "#0265DC",
                "name": { "property": "color", "component": "button", "variant": "accent" }
            }),
            layer: Layer::Platform,
        },
    ];
    TokenGraph::from_records(records)
}

// ── FindWizardState unit tests (test find module directly, no App/update) ────

#[test]
fn new_state_is_on_filters_screen() {
    let fs = FindWizardState::new();
    assert_eq!(fs.screen, FindScreen::Filters);
}

#[test]
fn new_with_intent_seeds_intent_field_and_focuses_it() {
    let fs = FindWizardState::new_with_intent("accent background");
    assert_eq!(fs.intent.value(), "accent background");
    assert_eq!(fs.focused_field, 4);
}

#[test]
fn new_with_empty_intent_leaves_focus_at_property() {
    let fs = FindWizardState::new_with_intent("");
    assert_eq!(fs.focused_field, 0);
}

#[test]
fn assemble_expr_from_property_and_variant() {
    let mut fs = FindWizardState::new();
    let graph = make_find_graph();
    let index = TokenIndex::build(&graph);
    for c in "background-color".chars() {
        fs.handle_key(key(KeyCode::Char(c)), &graph, &index);
    }
    fs.handle_key(key(KeyCode::Tab), &graph, &index);
    fs.handle_key(key(KeyCode::Tab), &graph, &index);
    for c in "accent".chars() {
        fs.handle_key(key(KeyCode::Char(c)), &graph, &index);
    }
    let expr = fs.assemble_expr().unwrap();
    assert_eq!(expr, "property=background-color,variant=accent");
}

#[test]
fn assemble_expr_returns_none_when_all_fields_empty() {
    let fs = FindWizardState::new();
    assert!(fs.assemble_expr().is_none());
}

#[test]
fn refresh_preview_populates_rows_for_structured_filter() {
    let graph = make_find_graph();
    let index = TokenIndex::build(&graph);
    let mut fs = FindWizardState::new();
    for c in "background-color".chars() {
        fs.handle_key(key(KeyCode::Char(c)), &graph, &index);
    }
    fs.refresh_preview(&graph, &index);
    assert_eq!(fs.preview_count, 2);
    assert!(fs.preview_error.is_none());
}

#[test]
fn refresh_preview_uses_suggest_when_only_intent_filled() {
    let graph = make_find_graph();
    let index = TokenIndex::build(&graph);
    let mut fs = FindWizardState::new_with_intent("accent background");
    fs.refresh_preview(&graph, &index);
    assert!(fs.preview_count > 0);
    assert!(fs.preview_rows.iter().any(|r| r.name.contains("accent")));
    assert!(fs.preview_error.is_none());
}

#[test]
fn refresh_preview_is_empty_when_nothing_filled() {
    let graph = make_find_graph();
    let index = TokenIndex::build(&graph);
    let mut fs = FindWizardState::new();
    fs.refresh_preview(&graph, &index);
    assert_eq!(fs.preview_count, 0);
    assert!(fs.preview_rows.is_empty());
    assert!(fs.preview_error.is_none());
}

#[test]
fn enter_on_filters_advances_to_preview() {
    let graph = make_find_graph();
    let index = TokenIndex::build(&graph);
    let mut fs = FindWizardState::new();
    let event = fs.handle_key(key(KeyCode::Enter), &graph, &index);
    assert!(matches!(event, FindEvent::Continue));
    assert_eq!(fs.screen, FindScreen::Preview);
}

#[test]
fn enter_on_preview_emits_open_results() {
    let graph = make_find_graph();
    let index = TokenIndex::build(&graph);
    let mut fs = FindWizardState::new();
    for c in "background-color".chars() {
        fs.handle_key(key(KeyCode::Char(c)), &graph, &index);
    }
    fs.handle_key(key(KeyCode::Enter), &graph, &index);
    assert_eq!(fs.screen, FindScreen::Preview);
    let event = fs.handle_key(key(KeyCode::Enter), &graph, &index);
    assert!(matches!(event, FindEvent::OpenResults(_)));
}

#[test]
fn open_results_view_has_correct_row_count() {
    let graph = make_find_graph();
    let index = TokenIndex::build(&graph);
    let mut fs = FindWizardState::new();
    for c in "background-color".chars() {
        fs.handle_key(key(KeyCode::Char(c)), &graph, &index);
    }
    fs.handle_key(key(KeyCode::Enter), &graph, &index);
    let event = fs.handle_key(key(KeyCode::Enter), &graph, &index);
    if let FindEvent::OpenResults(view) = event {
        assert!(view.rows.len() >= 1);
        assert_eq!(view.expr_text, "property=background-color");
    } else {
        panic!("expected OpenResults");
    }
}

#[test]
fn e_on_preview_goes_back_to_filters() {
    let graph = make_find_graph();
    let index = TokenIndex::build(&graph);
    let mut fs = FindWizardState::new();
    fs.handle_key(key(KeyCode::Enter), &graph, &index);
    let event = fs.handle_key(key(KeyCode::Char('e')), &graph, &index);
    assert!(matches!(event, FindEvent::Continue));
    assert_eq!(fs.screen, FindScreen::Filters);
}

#[test]
fn esc_cancels_on_filters_screen() {
    let graph = make_find_graph();
    let index = TokenIndex::build(&graph);
    let mut fs = FindWizardState::new();
    let event = fs.handle_key(key(KeyCode::Esc), &graph, &index);
    assert!(matches!(event, FindEvent::Cancel));
}

#[test]
fn esc_cancels_on_preview_screen() {
    let graph = make_find_graph();
    let index = TokenIndex::build(&graph);
    let mut fs = FindWizardState::new();
    fs.handle_key(key(KeyCode::Enter), &graph, &index);
    let event = fs.handle_key(key(KeyCode::Esc), &graph, &index);
    assert!(matches!(event, FindEvent::Cancel));
}

#[test]
fn q_cancels_on_preview_screen() {
    let graph = make_find_graph();
    let index = TokenIndex::build(&graph);
    let mut fs = FindWizardState::new();
    fs.handle_key(key(KeyCode::Enter), &graph, &index);
    let event = fs.handle_key(key(KeyCode::Char('q')), &graph, &index);
    assert!(matches!(event, FindEvent::Cancel));
}

#[test]
fn tab_cycles_through_fields() {
    let graph = make_find_graph();
    let index = TokenIndex::build(&graph);
    let mut fs = FindWizardState::new();
    assert_eq!(fs.focused_field, 0);
    fs.handle_key(key(KeyCode::Tab), &graph, &index);
    assert_eq!(fs.focused_field, 1);
    fs.handle_key(key(KeyCode::Tab), &graph, &index);
    assert_eq!(fs.focused_field, 2);
    fs.handle_key(key(KeyCode::BackTab), &graph, &index);
    assert_eq!(fs.focused_field, 1);
}

#[test]
fn tab_wraps_around_from_last_to_first_field() {
    let graph = make_find_graph();
    let index = TokenIndex::build(&graph);
    let mut fs = FindWizardState::new();
    for _ in 0..4 {
        fs.handle_key(key(KeyCode::Tab), &graph, &index);
    }
    assert_eq!(fs.focused_field, 4);
    fs.handle_key(key(KeyCode::Tab), &graph, &index);
    assert_eq!(fs.focused_field, 0);
}

#[test]
fn property_suggestions_filter_by_typed_prefix() {
    let mut fs = FindWizardState::new();
    let graph = make_find_graph();
    let index = TokenIndex::build(&graph);
    for c in "background".chars() {
        fs.handle_key(key(KeyCode::Char(c)), &graph, &index);
    }
    assert!(!fs.property_suggestions.is_empty());
    assert!(fs
        .property_suggestions
        .iter()
        .all(|s| s.contains("background")));
}

#[test]
fn up_down_navigate_property_suggestions() {
    let mut fs = FindWizardState::new();
    let graph = make_find_graph();
    let index = TokenIndex::build(&graph);
    for c in "color".chars() {
        fs.handle_key(key(KeyCode::Char(c)), &graph, &index);
    }
    assert!(
        fs.property_suggestions.len() > 1,
        "expected >1 'color' suggestions from registry, got {}",
        fs.property_suggestions.len()
    );
    let initial = fs.selected_property_suggestion;
    fs.handle_key(key(KeyCode::Down), &graph, &index);
    assert_eq!(fs.selected_property_suggestion, initial + 1);
    fs.handle_key(key(KeyCode::Up), &graph, &index);
    assert_eq!(fs.selected_property_suggestion, initial);
}

#[test]
fn refresh_preview_sets_error_on_invalid_expression() {
    let graph = make_find_graph();
    let index = TokenIndex::build(&graph);
    let mut fs = FindWizardState::new();
    fs.property = tui_input::Input::from("foo,bar".to_string());
    fs.refresh_preview(&graph, &index);
    assert!(
        fs.preview_error.is_some(),
        "expected parse error for condition missing operator"
    );
    assert_eq!(fs.preview_count, 0);
    assert!(fs.preview_rows.is_empty());
}

#[test]
fn assemble_expr_round_trips_through_query_parse_and_finds_rows() {
    let graph = make_find_graph();
    let index = TokenIndex::build(&graph);
    let mut fs = FindWizardState::new();
    for c in "background-color".chars() {
        fs.handle_key(key(KeyCode::Char(c)), &graph, &index);
    }
    fs.refresh_preview(&graph, &index);
    assert!(
        fs.preview_error.is_none(),
        "parse error: {:?}",
        fs.preview_error
    );
    assert!(
        fs.preview_count >= 1,
        "expected at least one match for property=background-color"
    );
}

#[test]
fn backtab_wraps_from_first_to_last_field() {
    let graph = make_find_graph();
    let index = TokenIndex::build(&graph);
    let mut fs = FindWizardState::new();
    assert_eq!(fs.focused_field, 0);
    fs.handle_key(key(KeyCode::BackTab), &graph, &index);
    assert_eq!(fs.focused_field, FindWizardState::FIELD_COUNT - 1);
}

#[test]
fn intent_only_flow_emits_open_results_with_intent_as_expr_text() {
    let graph = make_find_graph();
    let index = TokenIndex::build(&graph);
    let mut fs = FindWizardState::new_with_intent("accent background");
    fs.handle_key(key(KeyCode::Enter), &graph, &index);
    assert_eq!(fs.screen, FindScreen::Preview);
    assert!(fs.preview_count > 0);
    let event = fs.handle_key(key(KeyCode::Enter), &graph, &index);
    if let FindEvent::OpenResults(view) = event {
        assert_eq!(view.expr_text, "accent background");
        assert!(!view.rows.is_empty());
    } else {
        panic!("expected OpenResults");
    }
}

// ── App-level integration tests (migrated to Model + update) ─────────────────

fn submit(model: &mut Model, ctx: &UpdateCtx<'_>, cmd: &str) {
    update(model, Message::PaletteSubmit(cmd.into()), ctx);
}

#[test]
fn find_command_opens_find_modal() {
    let graph = make_find_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    submit(&mut model, &ctx, "find");
    assert!(matches!(model.modal(), Some(Modal::Find(_))));
}

#[test]
fn find_command_with_args_seeds_intent() {
    let graph = make_find_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    submit(&mut model, &ctx, "find accent background");
    if let Some(Modal::Find(ref fs)) = model.modal() {
        assert_eq!(fs.intent.value(), "accent background");
    } else {
        panic!("expected Find modal");
    }
}

#[test]
fn find_command_no_args_opens_modal_with_empty_fields() {
    let graph = make_find_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    submit(&mut model, &ctx, "find");
    if let Some(Modal::Find(ref fs)) = model.modal() {
        assert_eq!(fs.intent.value(), "");
        assert_eq!(fs.focused_field, 0);
    } else {
        panic!("expected Find modal");
    }
}

#[test]
fn tab_autocompletes_find_command() {
    let graph = make_find_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Char(':'))), &ctx);
    for c in "fi".chars() {
        update(&mut model, Message::Key(key(KeyCode::Char(c))), &ctx);
    }
    update(&mut model, Message::Key(key(KeyCode::Tab)), &ctx);
    assert_eq!(model.palette_input_value(), "find ");
}

#[test]
fn esc_in_find_modal_closes_it() {
    let graph = make_find_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    submit(&mut model, &ctx, "find");
    assert!(model.is_modal_open());
    update(&mut model, Message::Key(key(KeyCode::Esc)), &ctx);
    assert!(!model.is_modal_open());
}

#[test]
fn accepting_preview_opens_query_view_and_closes_modal() {
    let graph = make_find_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    submit(&mut model, &ctx, "find");

    // Type property field, then Enter → Preview.
    for c in "background-color".chars() {
        update(&mut model, Message::Key(key(KeyCode::Char(c))), &ctx);
    }
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx); // → Preview

    // Enter → OpenResults.
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx);

    assert!(!model.is_modal_open());
    assert!(matches!(model.active_view, ActiveView::Query(_)));
    let msg = model
        .status_message
        .as_ref()
        .map(|m| m.text.as_str())
        .unwrap_or("");
    assert!(
        msg.contains("matched"),
        "expected 'matched' in status: {msg}"
    );
}

#[test]
fn e_on_preview_keeps_modal_open_and_returns_to_filters() {
    let graph = make_find_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    submit(&mut model, &ctx, "find");

    // Advance to Preview.
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx);
    // Press e → back to Filters.
    update(&mut model, Message::Key(key(KeyCode::Char('e'))), &ctx);

    assert!(model.is_modal_open(), "e should not close the modal");
    assert!(matches!(model.active_view, ActiveView::Empty));
    if let Some(Modal::Find(ref fs)) = model.modal() {
        assert_eq!(fs.screen, FindScreen::Filters);
    }
}
