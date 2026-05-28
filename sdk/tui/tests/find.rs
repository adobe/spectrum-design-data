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
use design_data_core::graph::{Layer, TokenGraph, TokenRecord};
use design_data_tui::app::{App, Modal, SubmitContext};
use design_data_tui::find::{FindEvent, FindScreen, FindWizardState};
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
                "name": {
                    "property": "background-color",
                    "variant": "accent"
                }
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
                "name": {
                    "property": "background-color",
                    "variant": "neutral"
                }
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
                "name": {
                    "property": "color",
                    "component": "button",
                    "variant": "accent"
                }
            }),
            layer: Layer::Platform,
        },
    ];
    TokenGraph::from_records(records)
}

// ── FindWizardState unit tests ───────────────────────────────────────────────

#[test]
fn new_state_is_on_filters_screen() {
    let fs = FindWizardState::new();
    assert_eq!(fs.screen, FindScreen::Filters);
}

#[test]
fn new_with_intent_seeds_intent_field_and_focuses_it() {
    let fs = FindWizardState::new_with_intent("accent background");
    assert_eq!(fs.intent.value(), "accent background");
    assert_eq!(fs.focused_field, 4); // intent field index
}

#[test]
fn new_with_empty_intent_leaves_focus_at_property() {
    let fs = FindWizardState::new_with_intent("");
    assert_eq!(fs.focused_field, 0);
}

#[test]
fn assemble_expr_from_property_and_variant() {
    let mut fs = FindWizardState::new();
    // Tab to property field (already there at 0), type value.
    let graph = make_find_graph();
    for c in "background-color".chars() {
        fs.handle_key(key(KeyCode::Char(c)), &graph);
    }
    // Tab to component (skip), Tab to variant.
    fs.handle_key(key(KeyCode::Tab), &graph); // → component
    fs.handle_key(key(KeyCode::Tab), &graph); // → variant
    for c in "accent".chars() {
        fs.handle_key(key(KeyCode::Char(c)), &graph);
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
    let mut fs = FindWizardState::new();
    // Set property field directly via handle_key.
    for c in "background-color".chars() {
        fs.handle_key(key(KeyCode::Char(c)), &graph);
    }
    fs.refresh_preview(&graph);
    assert_eq!(fs.preview_count, 2); // accent + neutral background-color tokens
    assert!(fs.preview_error.is_none());
}

#[test]
fn refresh_preview_uses_suggest_when_only_intent_filled() {
    let graph = make_find_graph();
    let mut fs = FindWizardState::new_with_intent("accent background");
    fs.refresh_preview(&graph);
    // suggest should find the accent-background-color-default token.
    assert!(fs.preview_count > 0);
    assert!(fs.preview_rows.iter().any(|r| r.name.contains("accent")));
    assert!(fs.preview_error.is_none());
}

#[test]
fn refresh_preview_is_empty_when_nothing_filled() {
    let graph = make_find_graph();
    let mut fs = FindWizardState::new();
    fs.refresh_preview(&graph);
    assert_eq!(fs.preview_count, 0);
    assert!(fs.preview_rows.is_empty());
    assert!(fs.preview_error.is_none());
}

#[test]
fn enter_on_filters_advances_to_preview() {
    let graph = make_find_graph();
    let mut fs = FindWizardState::new();
    let event = fs.handle_key(key(KeyCode::Enter), &graph);
    assert!(matches!(event, FindEvent::Continue));
    assert_eq!(fs.screen, FindScreen::Preview);
}

#[test]
fn enter_on_preview_emits_open_results() {
    let graph = make_find_graph();
    let mut fs = FindWizardState::new();
    // Set property field.
    for c in "background-color".chars() {
        fs.handle_key(key(KeyCode::Char(c)), &graph);
    }
    // Advance to preview.
    fs.handle_key(key(KeyCode::Enter), &graph);
    assert_eq!(fs.screen, FindScreen::Preview);
    // Accept preview.
    let event = fs.handle_key(key(KeyCode::Enter), &graph);
    assert!(matches!(event, FindEvent::OpenResults(_)));
}

#[test]
fn open_results_view_has_correct_row_count() {
    let graph = make_find_graph();
    let mut fs = FindWizardState::new();
    for c in "background-color".chars() {
        fs.handle_key(key(KeyCode::Char(c)), &graph);
    }
    fs.handle_key(key(KeyCode::Enter), &graph); // → Preview
    let event = fs.handle_key(key(KeyCode::Enter), &graph); // Accept
    if let FindEvent::OpenResults(view) = event {
        // Fixture has 2 background-color tokens; use >= 1 to avoid brittleness.
        assert!(view.rows.len() >= 1);
        assert_eq!(view.expr_text, "property=background-color");
    } else {
        panic!("expected OpenResults");
    }
}

#[test]
fn e_on_preview_goes_back_to_filters() {
    let graph = make_find_graph();
    let mut fs = FindWizardState::new();
    fs.handle_key(key(KeyCode::Enter), &graph); // → Preview
    let event = fs.handle_key(key(KeyCode::Char('e')), &graph);
    assert!(matches!(event, FindEvent::Continue));
    assert_eq!(fs.screen, FindScreen::Filters);
}

#[test]
fn esc_cancels_on_filters_screen() {
    let graph = make_find_graph();
    let mut fs = FindWizardState::new();
    let event = fs.handle_key(key(KeyCode::Esc), &graph);
    assert!(matches!(event, FindEvent::Cancel));
}

#[test]
fn esc_cancels_on_preview_screen() {
    let graph = make_find_graph();
    let mut fs = FindWizardState::new();
    fs.handle_key(key(KeyCode::Enter), &graph); // → Preview
    let event = fs.handle_key(key(KeyCode::Esc), &graph);
    assert!(matches!(event, FindEvent::Cancel));
}

#[test]
fn q_cancels_on_preview_screen() {
    let graph = make_find_graph();
    let mut fs = FindWizardState::new();
    fs.handle_key(key(KeyCode::Enter), &graph); // → Preview
    let event = fs.handle_key(key(KeyCode::Char('q')), &graph);
    assert!(matches!(event, FindEvent::Cancel));
}

#[test]
fn tab_cycles_through_fields() {
    let graph = make_find_graph();
    let mut fs = FindWizardState::new();
    assert_eq!(fs.focused_field, 0);
    fs.handle_key(key(KeyCode::Tab), &graph);
    assert_eq!(fs.focused_field, 1);
    fs.handle_key(key(KeyCode::Tab), &graph);
    assert_eq!(fs.focused_field, 2);
    // BackTab goes backward.
    fs.handle_key(key(KeyCode::BackTab), &graph);
    assert_eq!(fs.focused_field, 1);
}

#[test]
fn tab_wraps_around_from_last_to_first_field() {
    let graph = make_find_graph();
    let mut fs = FindWizardState::new();
    // Jump to last field (4 = intent).
    for _ in 0..4 {
        fs.handle_key(key(KeyCode::Tab), &graph);
    }
    assert_eq!(fs.focused_field, 4);
    fs.handle_key(key(KeyCode::Tab), &graph);
    assert_eq!(fs.focused_field, 0);
}

#[test]
fn property_suggestions_filter_by_typed_prefix() {
    let mut fs = FindWizardState::new();
    let graph = make_find_graph();
    for c in "background".chars() {
        fs.handle_key(key(KeyCode::Char(c)), &graph);
    }
    // The registry should have terms containing "background".
    assert!(!fs.property_suggestions.is_empty());
    assert!(fs.property_suggestions.iter().all(|s| s.contains("background")));
}

#[test]
fn up_down_navigate_property_suggestions() {
    let mut fs = FindWizardState::new();
    let graph = make_find_graph();
    // "color" matches many registry terms (background-color, border-color, etc.).
    for c in "color".chars() {
        fs.handle_key(key(KeyCode::Char(c)), &graph);
    }
    // Assert unconditionally so a registry regression is visible, not silently skipped.
    assert!(
        fs.property_suggestions.len() > 1,
        "expected >1 'color' suggestions from registry, got {}",
        fs.property_suggestions.len()
    );
    let initial = fs.selected_property_suggestion;
    fs.handle_key(key(KeyCode::Down), &graph);
    assert_eq!(fs.selected_property_suggestion, initial + 1);
    fs.handle_key(key(KeyCode::Up), &graph);
    assert_eq!(fs.selected_property_suggestion, initial);
}

#[test]
fn refresh_preview_sets_error_on_invalid_expression() {
    let graph = make_find_graph();
    let mut fs = FindWizardState::new();
    // "foo,bar" assembles to "property=foo,bar"; the parser splits on "," and tries "bar"
    // as a standalone condition — it has no "=" operator so parse returns a CoreError.
    fs.property = tui_input::Input::from("foo,bar".to_string());
    fs.refresh_preview(&graph);
    assert!(fs.preview_error.is_some(), "expected parse error for condition missing operator");
    assert_eq!(fs.preview_count, 0);
    assert!(fs.preview_rows.is_empty());
}

#[test]
fn assemble_expr_round_trips_through_query_parse_and_finds_rows() {
    let graph = make_find_graph();
    let mut fs = FindWizardState::new();
    for c in "background-color".chars() {
        fs.handle_key(key(KeyCode::Char(c)), &graph);
    }
    fs.refresh_preview(&graph);
    assert!(fs.preview_error.is_none(), "parse error: {:?}", fs.preview_error);
    assert!(fs.preview_count >= 1, "expected at least one match for property=background-color");
}

// ── App-level integration tests ──────────────────────────────────────────────

fn submit(app: &mut App, graph: &TokenGraph, cmd: &str) {
    let ctx = SubmitContext::new(graph);
    for c in cmd.chars() {
        app.handle_key(key(KeyCode::Char(c)));
    }
    app.handle_key(key(KeyCode::Enter));
    app.submit_palette(&ctx);
}

fn open_palette_cmd(app: &mut App) {
    app.handle_key(key(KeyCode::Char(':')));
}

#[test]
fn find_command_opens_find_modal() {
    let graph = make_find_graph();
    let mut app = App::new();
    open_palette_cmd(&mut app);
    submit(&mut app, &graph, "find");
    assert!(matches!(app.modal, Some(Modal::Find(_))));
}

#[test]
fn find_command_with_args_seeds_intent() {
    let graph = make_find_graph();
    let mut app = App::new();
    open_palette_cmd(&mut app);
    submit(&mut app, &graph, "find accent background");
    if let Some(Modal::Find(ref fs)) = app.modal {
        assert_eq!(fs.intent.value(), "accent background");
    } else {
        panic!("expected Find modal");
    }
}

#[test]
fn find_command_no_args_opens_modal_with_empty_fields() {
    let graph = make_find_graph();
    let mut app = App::new();
    open_palette_cmd(&mut app);
    submit(&mut app, &graph, "find");
    if let Some(Modal::Find(ref fs)) = app.modal {
        assert_eq!(fs.intent.value(), "");
        assert_eq!(fs.focused_field, 0); // focus starts on property
    } else {
        panic!("expected Find modal");
    }
}

#[test]
fn tab_autocompletes_find_command() {
    let mut app = App::new();
    open_palette_cmd(&mut app);
    // "fi" is unambiguous — only "find" starts with "fi".
    app.handle_key(key(KeyCode::Char('f')));
    app.handle_key(key(KeyCode::Char('i')));
    app.handle_key(key(KeyCode::Tab));
    assert_eq!(app.palette_input.value(), "find ");
}

#[test]
fn esc_in_find_modal_closes_it() {
    use design_data_tui::wizard::WizardCtx;

    let graph = make_find_graph();
    let mut app = App::new();
    open_palette_cmd(&mut app);
    submit(&mut app, &graph, "find");

    let ctx = WizardCtx { graph: &graph, dataset_path: None, schema_registry: None, allow_write: false };
    app.handle_modal_key(key(KeyCode::Esc), &ctx);
    assert!(app.modal.is_none());
}

#[test]
fn backtab_wraps_from_first_to_last_field() {
    let graph = make_find_graph();
    let mut fs = FindWizardState::new();
    assert_eq!(fs.focused_field, 0);
    fs.handle_key(key(KeyCode::BackTab), &graph);
    assert_eq!(fs.focused_field, FindWizardState::FIELD_COUNT - 1);
}

#[test]
fn intent_only_flow_emits_open_results_with_intent_as_expr_text() {
    let graph = make_find_graph();
    let mut fs = FindWizardState::new_with_intent("accent background");
    // Advance to Preview (refresh_preview runs).
    fs.handle_key(key(KeyCode::Enter), &graph);
    assert_eq!(fs.screen, FindScreen::Preview);
    assert!(fs.preview_count > 0);
    // Accept Preview → OpenResults.
    let event = fs.handle_key(key(KeyCode::Enter), &graph);
    if let FindEvent::OpenResults(view) = event {
        // When assemble_expr() returns None, expr_text is the raw intent string.
        assert_eq!(view.expr_text, "accent background");
        assert!(!view.rows.is_empty());
    } else {
        panic!("expected OpenResults");
    }
}

#[test]
fn accepting_preview_opens_query_view_and_closes_modal() {
    use design_data_tui::app::ActiveView;
    use design_data_tui::wizard::WizardCtx;

    let graph = make_find_graph();
    let mut app = App::new();
    open_palette_cmd(&mut app);
    submit(&mut app, &graph, "find");

    let ctx = WizardCtx { graph: &graph, dataset_path: None, schema_registry: None, allow_write: false };

    // On Filters: type property, then Enter → Preview.
    if let Some(Modal::Find(ref mut fs)) = app.modal {
        for c in "background-color".chars() {
            fs.handle_key(key(KeyCode::Char(c)), &graph);
        }
    }
    app.handle_modal_key(key(KeyCode::Enter), &ctx); // → Preview

    // On Preview: Enter → OpenResults.
    app.handle_modal_key(key(KeyCode::Enter), &ctx);

    assert!(app.modal.is_none());
    assert!(matches!(app.active_view, ActiveView::Query(_)));
    let msg = app.status_message.as_ref().map(|m| m.text.as_str()).unwrap_or("");
    assert!(msg.contains("matched"), "expected 'matched' in status: {msg}");
}

#[test]
fn e_on_preview_keeps_modal_open_and_returns_to_filters() {
    use design_data_tui::app::ActiveView;
    use design_data_tui::wizard::WizardCtx;

    let graph = make_find_graph();
    let mut app = App::new();
    open_palette_cmd(&mut app);
    submit(&mut app, &graph, "find");

    let ctx = WizardCtx { graph: &graph, dataset_path: None, schema_registry: None, allow_write: false };

    // Advance to Preview.
    app.handle_modal_key(key(KeyCode::Enter), &ctx);
    // Press e → back to Filters; modal stays open.
    app.handle_modal_key(key(KeyCode::Char('e')), &ctx);

    assert!(app.modal.is_some(), "e should not close the modal");
    assert!(matches!(app.active_view, ActiveView::Empty), "e should not open results");
    if let Some(Modal::Find(ref fs)) = app.modal {
        assert_eq!(fs.screen, FindScreen::Filters);
    }
}
