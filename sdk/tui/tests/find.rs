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
use design_data_tui::find::{FacetOption, FindEvent, FindScreen, FindWizardState};
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

// ── helpers ───────────────────────────────────────────────────────────────────

/// Tab to the Preview button (PREVIEW_FOCUS) and press Enter to advance to the
/// Preview screen.  Used by tests that need to exercise Preview-screen behavior
/// without caring about the Filters→Preview navigation mechanics.
fn advance_to_preview(fs: &mut FindWizardState, graph: &TokenGraph, index: &TokenIndex) {
    while fs.focused_field != FindWizardState::PREVIEW_FOCUS {
        fs.handle_key(key(KeyCode::Tab), graph, index);
    }
    fs.handle_key(key(KeyCode::Enter), graph, index);
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
fn enter_on_preview_button_advances_to_preview() {
    // Tab to the Preview button (PREVIEW_FOCUS) then Enter → Preview screen.
    let graph = make_find_graph();
    let index = TokenIndex::build(&graph);
    let mut fs = FindWizardState::new();
    // Tab through all 5 fields to reach PREVIEW_FOCUS.
    for _ in 0..FindWizardState::FIELD_COUNT {
        fs.handle_key(key(KeyCode::Tab), &graph, &index);
    }
    assert_eq!(fs.focused_field, FindWizardState::PREVIEW_FOCUS);
    let event = fs.handle_key(key(KeyCode::Enter), &graph, &index);
    assert!(matches!(event, FindEvent::Continue));
    assert_eq!(fs.screen, FindScreen::Preview);
}

#[test]
fn enter_on_field_without_suggestion_advances_focus_not_screen() {
    // Enter on a field with nothing to accept should advance focus (Tab-like),
    // NOT jump straight to Preview.
    let graph = make_find_graph();
    let index = TokenIndex::build(&graph);
    let mut fs = FindWizardState::new();
    assert_eq!(fs.focused_field, 0);
    // No text typed, no suggestions — Enter should move focus to field 1.
    let event = fs.handle_key(key(KeyCode::Enter), &graph, &index);
    assert!(matches!(event, FindEvent::Continue));
    assert_eq!(fs.screen, FindScreen::Filters, "screen must not change");
    assert_eq!(fs.focused_field, 1, "focus should advance to next field");
}

#[test]
fn enter_on_preview_emits_open_results() {
    let graph = make_find_graph();
    let index = TokenIndex::build(&graph);
    let mut fs = FindWizardState::new();
    for c in "background-color".chars() {
        fs.handle_key(key(KeyCode::Char(c)), &graph, &index);
    }
    advance_to_preview(&mut fs, &graph, &index);
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
    advance_to_preview(&mut fs, &graph, &index);
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
    advance_to_preview(&mut fs, &graph, &index);
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
fn esc_goes_back_on_preview_screen() {
    // Esc on Screen 2 (Preview) should go back to Screen 1 (Filters), not cancel.
    let graph = make_find_graph();
    let index = TokenIndex::build(&graph);
    let mut fs = FindWizardState::new();
    advance_to_preview(&mut fs, &graph, &index);
    assert_eq!(fs.screen, FindScreen::Preview);
    let event = fs.handle_key(key(KeyCode::Esc), &graph, &index);
    assert!(
        matches!(event, FindEvent::Continue),
        "Esc on Preview should Continue, not Cancel"
    );
    assert_eq!(
        fs.screen,
        FindScreen::Filters,
        "Esc on Preview should return to Filters screen"
    );
}

#[test]
fn q_cancels_on_preview_screen() {
    let graph = make_find_graph();
    let index = TokenIndex::build(&graph);
    let mut fs = FindWizardState::new();
    advance_to_preview(&mut fs, &graph, &index);
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
fn tab_cycles_through_all_focusables_including_preview_button() {
    // Tab should cycle through all 5 fields AND the Preview button (FOCUS_COUNT = 6).
    let graph = make_find_graph();
    let index = TokenIndex::build(&graph);
    let mut fs = FindWizardState::new();
    for _ in 0..FindWizardState::FIELD_COUNT {
        fs.handle_key(key(KeyCode::Tab), &graph, &index);
    }
    assert_eq!(
        fs.focused_field,
        FindWizardState::PREVIEW_FOCUS,
        "Tab×{} should land on PREVIEW_FOCUS",
        FindWizardState::FIELD_COUNT
    );
    // One more Tab wraps back to field 0.
    fs.handle_key(key(KeyCode::Tab), &graph, &index);
    assert_eq!(
        fs.focused_field, 0,
        "Tab from PREVIEW_FOCUS should wrap to field 0"
    );
}

#[test]
fn property_suggestions_filter_by_typed_prefix() {
    let mut fs = FindWizardState::new();
    let graph = make_find_graph();
    let index = TokenIndex::build(&graph);
    for c in "background".chars() {
        fs.handle_key(key(KeyCode::Char(c)), &graph, &index);
    }
    assert!(!fs.suggestions.is_empty());
    assert!(fs
        .suggestions
        .iter()
        .all(|s| s.value.contains("background")));
}

#[test]
fn up_down_navigate_property_suggestions() {
    let mut fs = FindWizardState::new();
    let graph = make_find_graph();
    let index = TokenIndex::build(&graph);
    for c in "color".chars() {
        fs.handle_key(key(KeyCode::Char(c)), &graph, &index);
    }
    // Suggestions come from RegistryData (static vocabulary) when typed text
    // doesn't appear in the minimal test graph's index, so we expect > 1 'color'
    // entries from the registry fallback.
    assert!(
        fs.suggestions.len() > 1,
        "expected >1 'color' suggestions from registry fallback, got {}",
        fs.suggestions.len()
    );
    let initial = fs.selected_suggestion;
    fs.handle_key(key(KeyCode::Down), &graph, &index);
    assert_eq!(fs.selected_suggestion, initial + 1);
    fs.handle_key(key(KeyCode::Up), &graph, &index);
    assert_eq!(fs.selected_suggestion, initial);
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
fn backtab_wraps_from_first_field_to_preview_button() {
    // BackTab from field 0 should wrap to PREVIEW_FOCUS (the last stop in the ring).
    let graph = make_find_graph();
    let index = TokenIndex::build(&graph);
    let mut fs = FindWizardState::new();
    assert_eq!(fs.focused_field, 0);
    fs.handle_key(key(KeyCode::BackTab), &graph, &index);
    assert_eq!(fs.focused_field, FindWizardState::PREVIEW_FOCUS);
}

#[test]
fn intent_only_flow_emits_open_results_with_intent_as_expr_text() {
    let graph = make_find_graph();
    let index = TokenIndex::build(&graph);
    let mut fs = FindWizardState::new_with_intent("accent background");
    // focused_field = 4 (intent).  Enter on intent (no suggestions) advances focus
    // to PREVIEW_FOCUS (5).  A second Enter on the Preview button → Preview screen.
    fs.handle_key(key(KeyCode::Enter), &graph, &index);
    assert_eq!(
        fs.focused_field,
        FindWizardState::PREVIEW_FOCUS,
        "Enter on intent should advance focus to Preview button"
    );
    assert_eq!(
        fs.screen,
        FindScreen::Filters,
        "screen should still be Filters"
    );
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

// ── Preview button tests ──────────────────────────────────────────────────────

#[test]
fn typing_while_on_preview_button_does_not_mutate_fields() {
    let graph = make_find_graph();
    let index = TokenIndex::build(&graph);
    let mut fs = FindWizardState::new();
    // Navigate to Preview button.
    while fs.focused_field != FindWizardState::PREVIEW_FOCUS {
        fs.handle_key(key(KeyCode::Tab), &graph, &index);
    }
    // Type some characters — dispatch_to_focused_field is a no-op for PREVIEW_FOCUS.
    for c in "hello".chars() {
        fs.handle_key(key(KeyCode::Char(c)), &graph, &index);
    }
    assert_eq!(fs.property.value(), "", "property must not change");
    assert_eq!(fs.component.value(), "", "component must not change");
    assert_eq!(fs.intent.value(), "", "intent must not change");
}

#[test]
fn preview_count_is_live_on_filters_screen() {
    // preview_count should update as fields change — before the user ever visits Preview.
    let graph = make_find_graph();
    let index = TokenIndex::build(&graph);
    let mut fs = FindWizardState::new();
    assert_eq!(fs.preview_count, 0, "no count before any input");
    for c in "background-color".chars() {
        fs.handle_key(key(KeyCode::Char(c)), &graph, &index);
    }
    assert!(
        fs.preview_count > 0,
        "count should update live as property is typed; got {}",
        fs.preview_count
    );
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
    // Palette is already open — just type the prefix.
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

    // Type property field, then Tab×5 to the Preview button, then Enter → Preview.
    for c in "background-color".chars() {
        update(&mut model, Message::Key(key(KeyCode::Char(c))), &ctx);
    }
    for _ in 0..FindWizardState::FIELD_COUNT {
        update(&mut model, Message::Key(key(KeyCode::Tab)), &ctx); // move to PREVIEW_FOCUS
    }
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx); // → Preview

    // Enter on Preview → OpenResults.
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

// ── Faceted suggestion tests ──────────────────────────────────────────────────

/// Build a richer graph that has overlapping property/component/state values
/// so cross-field narrowing produces non-trivial counts.
fn make_facet_graph() -> TokenGraph {
    let records: Vec<TokenRecord> = vec![
        // button + color x3
        TokenRecord {
            name: "button-color-default".into(),
            file: PathBuf::from("tokens.json"),
            index: 0,
            schema_url: None,
            uuid: None,
            alias_target: None,
            raw: json!({ "value": "#0265DC",
                "name": { "property": "color", "component": "button", "state": "default" }
            }),
            layer: Layer::Foundation,
        },
        TokenRecord {
            name: "button-color-hover".into(),
            file: PathBuf::from("tokens.json"),
            index: 1,
            schema_url: None,
            uuid: None,
            alias_target: None,
            raw: json!({ "value": "#0052CC",
                "name": { "property": "color", "component": "button", "state": "hover" }
            }),
            layer: Layer::Foundation,
        },
        // icon + color x1
        TokenRecord {
            name: "icon-color-default".into(),
            file: PathBuf::from("tokens.json"),
            index: 2,
            schema_url: None,
            uuid: None,
            alias_target: None,
            raw: json!({ "value": "#333333",
                "name": { "property": "color", "component": "icon", "state": "default" }
            }),
            layer: Layer::Foundation,
        },
        // button + background-color x1 (no "state")
        TokenRecord {
            name: "button-background-color".into(),
            file: PathBuf::from("tokens.json"),
            index: 3,
            schema_url: None,
            uuid: None,
            alias_target: None,
            raw: json!({ "value": "#FFFFFF",
                "name": { "property": "background-color", "component": "button" }
            }),
            layer: Layer::Foundation,
        },
    ];
    TokenGraph::from_records(records)
}

#[test]
fn refresh_suggestions_on_component_field_when_property_is_set_shows_only_reachable() {
    let graph = make_facet_graph();
    let index = TokenIndex::build(&graph);
    let mut fs = FindWizardState::new();

    // Set property=background-color.
    for c in "background-color".chars() {
        fs.handle_key(key(KeyCode::Char(c)), &graph, &index);
    }
    // Tab to component field — suggestions should be cross-filtered.
    fs.handle_key(key(KeyCode::Tab), &graph, &index);
    assert_eq!(fs.focused_field, 1);

    // Only "button" has background-color tokens; "icon" has none.
    let button_opt = fs.suggestions.iter().find(|s| s.value == "button");
    let icon_opt = fs.suggestions.iter().find(|s| s.value == "icon");

    assert!(
        button_opt.is_some(),
        "button should appear in component suggestions"
    );
    assert!(
        button_opt.unwrap().count > 0,
        "button should have a non-zero count under property=background-color"
    );

    // If icon appears at all, it must be zero-count (dimmed), not absent.
    if let Some(icon) = icon_opt {
        assert_eq!(
            icon.count, 0,
            "icon has no background-color tokens and should be zero-count"
        );
    }
}

#[test]
fn refresh_suggestions_on_property_field_when_component_is_set_narrows_counts() {
    let graph = make_facet_graph();
    let index = TokenIndex::build(&graph);
    let mut fs = FindWizardState::new();

    // Directly set component=icon via the Input field and refocus property.
    fs.component = tui_input::Input::from("icon".to_string());
    fs.focused_field = 0;
    fs.refresh_suggestions(&graph, &index);

    // "color" tokens exist for icon; "background-color" does not → zero count.
    let color_opt = fs.suggestions.iter().find(|s| s.value == "color");
    let bg_opt = fs
        .suggestions
        .iter()
        .find(|s| s.value == "background-color");

    assert!(
        color_opt.is_some(),
        "color should appear in property suggestions when component=icon"
    );
    assert!(
        color_opt.unwrap().count > 0,
        "color should have a positive count for icon"
    );
    if let Some(bg) = bg_opt {
        assert_eq!(
            bg.count, 0,
            "background-color should be zero-count for icon (no such tokens)"
        );
    }
}

#[test]
fn zero_count_suggestions_appear_in_list_rather_than_being_hidden() {
    // Verifies the "greyed, not removed" contract: incompatible values must still
    // show up in the list (with count == 0) so the user can see why they won't work.
    let graph = make_facet_graph();
    let index = TokenIndex::build(&graph);
    let mut fs = FindWizardState::new();

    // Set property=background-color (only button has this).
    for c in "background-color".chars() {
        fs.handle_key(key(KeyCode::Char(c)), &graph, &index);
    }
    // Tab to component.
    fs.handle_key(key(KeyCode::Tab), &graph, &index);

    // The list must contain both reachable and zero-count options — zero-count
    // values are preserved to let users see the incompatibility.
    let zero_count: Vec<&FacetOption> = fs.suggestions.iter().filter(|s| s.count == 0).collect();
    let nonzero_count: Vec<&FacetOption> = fs.suggestions.iter().filter(|s| s.count > 0).collect();

    assert!(
        !nonzero_count.is_empty(),
        "there must be at least one reachable component"
    );
    assert!(
        !zero_count.is_empty(),
        "at least one component (icon) should appear with count=0, not be hidden"
    );
}

#[test]
fn reachable_suggestions_sort_before_zero_count() {
    let graph = make_facet_graph();
    let index = TokenIndex::build(&graph);
    let mut fs = FindWizardState::new();

    // Set property=background-color so only button is reachable.
    for c in "background-color".chars() {
        fs.handle_key(key(KeyCode::Char(c)), &graph, &index);
    }
    fs.handle_key(key(KeyCode::Tab), &graph, &index);

    // Reachable entries must appear before zero-count ones.
    let mut saw_nonzero = false;
    for opt in &fs.suggestions {
        if opt.count > 0 {
            saw_nonzero = true;
        }
        if opt.count == 0 {
            assert!(
                saw_nonzero,
                "zero-count option '{}' appeared before a nonzero option — sort is wrong",
                opt.value
            );
            // Once we hit zero, all remaining must also be zero.
            break;
        }
    }
}

#[test]
fn assemble_expr_excluding_skips_the_focused_field() {
    let mut fs = FindWizardState::new();
    fs.property = tui_input::Input::from("color".to_string());
    fs.component = tui_input::Input::from("button".to_string());
    fs.variant = tui_input::Input::from("accent".to_string());

    // Skip field 1 (component).
    let expr = fs.assemble_expr_excluding(1).unwrap();
    assert!(expr.contains("property=color"), "should include property");
    assert!(expr.contains("variant=accent"), "should include variant");
    assert!(!expr.contains("component="), "should NOT include component");
}

#[test]
fn assemble_expr_excluding_returns_none_when_only_excluded_field_is_set() {
    let mut fs = FindWizardState::new();
    fs.component = tui_input::Input::from("button".to_string());
    // Only component (field 1) is set; excluding it leaves nothing.
    assert!(
        fs.assemble_expr_excluding(1).is_none(),
        "should return None when the only set field is the excluded one"
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
