// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! M5 polish milestone tests: mouse, help overlay, palette history, theming.

mod common;
use common::{empty_graph, key, make_graph_with_tokens, update_ctx};

use crossterm::event::{KeyCode, KeyModifiers, MouseButton, MouseEvent, MouseEventKind};
use design_data_tui::app::{
    ActiveView, DescribeView, HitAction, HitRegion, Modal, QueryRow, QueryView,
};
use design_data_tui::theme::Theme;
use design_data_tui::{update, Message, Model};
use ratatui::layout::Rect;

/// Build a mouse event at the given terminal cell.
fn mouse(kind: MouseEventKind, row: u16, col: u16) -> MouseEvent {
    MouseEvent {
        kind,
        row,
        column: col,
        modifiers: KeyModifiers::NONE,
    }
}

// ── Help overlay ──────────────────────────────────────────────────────────────

#[test]
fn question_mark_opens_help_modal() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Char('?'))), &ctx);
    assert!(
        matches!(model.modal(), Some(Modal::Help(_))),
        "? should open help modal"
    );
}

#[test]
fn esc_closes_help_modal() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Char('?'))), &ctx);
    update(&mut model, Message::Key(key(KeyCode::Esc)), &ctx);
    assert!(!model.is_modal_open(), "Esc should close help modal");
}

#[test]
fn question_mark_closes_help_modal() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Char('?'))), &ctx);
    update(&mut model, Message::Key(key(KeyCode::Char('?'))), &ctx);
    assert!(!model.is_modal_open(), "second ? should close help modal");
}

#[test]
fn pgdn_scrolls_help_body() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Char('?'))), &ctx);
    update(&mut model, Message::Key(key(KeyCode::PageDown)), &ctx);
    if let Some(Modal::Help(ref hm)) = model.modal() {
        assert_eq!(hm.scroll, 10, "PageDown should advance help scroll by 10");
    } else {
        panic!("expected Help modal to still be open");
    }
}

#[test]
fn arrow_keys_scroll_help_body() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Char('?'))), &ctx);
    update(&mut model, Message::Key(key(KeyCode::Down)), &ctx);
    update(&mut model, Message::Key(key(KeyCode::Down)), &ctx);
    update(&mut model, Message::Key(key(KeyCode::Up)), &ctx);
    if let Some(Modal::Help(ref hm)) = model.modal() {
        assert_eq!(hm.scroll, 1);
    } else {
        panic!("expected Help modal");
    }
}

// ── Palette history ───────────────────────────────────────────────────────────

#[test]
fn submit_palette_appends_to_history() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::PaletteSubmit("query *".into()), &ctx);
    assert_eq!(
        model.palette_history.first().map(|s| s.as_str()),
        Some("query *")
    );
}

#[test]
fn up_arrow_in_palette_recalls_last_command() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    model.palette_history = vec!["query foo".to_string(), "query bar".to_string()];

    // Palette is always open on the home screen — no key needed to open it.
    update(&mut model, Message::Key(key(KeyCode::Up)), &ctx);
    assert_eq!(model.palette_input_value(), "query foo");

    update(&mut model, Message::Key(key(KeyCode::Up)), &ctx);
    assert_eq!(model.palette_input_value(), "query bar");

    update(&mut model, Message::Key(key(KeyCode::Down)), &ctx);
    assert_eq!(model.palette_input_value(), "query foo");
}

#[test]
fn history_dedupes_consecutive_duplicates() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    model.palette_history = vec!["query *".to_string()];
    update(&mut model, Message::PaletteSubmit("query *".into()), &ctx);
    assert_eq!(
        model.palette_history.len(),
        1,
        "same command should not be duplicated"
    );
}

/// History dedup is head-only: only consecutive duplicates are suppressed.
/// A command that already exists deeper in history IS added again.
/// This is intentional (matches bash/zsh behavior).
#[test]
fn history_dedup_is_head_only_not_global() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    // History newest-first: [B, A] — head is B, submit A; B != A, so A IS added.
    // This documents that dedup is head-only: an identical entry deeper in history
    // is NOT deduplicated (matches bash/zsh behavior).
    model.palette_history = vec!["query B".to_string(), "query A".to_string()];
    update(&mut model, Message::PaletteSubmit("query A".into()), &ctx);
    assert_eq!(model.palette_history[0], "query A");
    assert_eq!(
        model.palette_history.len(),
        3,
        "non-consecutive duplicate should be added"
    );
    assert_eq!(model.palette_history, vec!["query A", "query B", "query A"]);
}

#[test]
fn history_caps_at_200_entries() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    model.palette_history = (0..199).map(|i| format!("query token-{i}")).collect();
    update(
        &mut model,
        Message::PaletteSubmit("query new-token".into()),
        &ctx,
    );
    assert_eq!(model.palette_history.len(), 200);
    assert_eq!(model.palette_history[0], "query new-token");
}

#[test]
fn typing_resets_history_cursor() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    model.palette_history = vec!["query foo".to_string(), "query bar".to_string()];

    // Palette is always open on the home screen — no key needed to open it.
    update(&mut model, Message::Key(key(KeyCode::Up)), &ctx);
    assert_eq!(model.palette_history_cursor(), Some(0));

    update(&mut model, Message::Key(key(KeyCode::Char('x'))), &ctx);
    assert_eq!(
        model.palette_history_cursor(),
        None,
        "typing should reset history cursor"
    );

    update(&mut model, Message::Key(key(KeyCode::Up)), &ctx);
    assert_eq!(model.palette_history_cursor(), Some(0));
    assert_eq!(model.palette_input_value(), "query foo");
}

// ── Mouse: wheel scroll ───────────────────────────────────────────────────────

#[test]
fn wheel_scroll_down_increments_describe_scroll() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    model.active_view = ActiveView::Describe(DescribeView {
        component: "button".to_string(),
        pretty_json: "{}".to_string(),
        scroll: 0,
        h_scroll: 0,
        selected: 0,
    });
    update(
        &mut model,
        Message::Mouse(mouse(MouseEventKind::ScrollDown, 5, 5)),
        &ctx,
    );
    if let ActiveView::Describe(ref dv) = model.active_view {
        assert!(dv.scroll > 0, "scroll down should advance describe scroll");
    }
}

// ── Mouse: click via hit regions ──────────────────────────────────────────────

#[test]
fn click_on_hit_region_selects_row() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    let rows = vec![
        QueryRow {
            name: "a".into(),
            value: "1".into(),
            file: "f".into(),
            layer: "foundation".into(),
        },
        QueryRow {
            name: "b".into(),
            value: "2".into(),
            file: "f".into(),
            layer: "foundation".into(),
        },
        QueryRow {
            name: "c".into(),
            value: "3".into(),
            file: "f".into(),
            layer: "foundation".into(),
        },
    ];
    model.active_view = ActiveView::Query(QueryView::new("*".to_string(), rows));
    model.hit_regions = vec![
        HitRegion {
            rect: Rect {
                x: 0,
                y: 2,
                width: 80,
                height: 1,
            },
            action: HitAction::SelectListRow(0),
            text: "a".into(),
        },
        HitRegion {
            rect: Rect {
                x: 0,
                y: 3,
                width: 80,
                height: 1,
            },
            action: HitAction::SelectListRow(1),
            text: "b".into(),
        },
        HitRegion {
            rect: Rect {
                x: 0,
                y: 4,
                width: 80,
                height: 1,
            },
            action: HitAction::SelectListRow(2),
            text: "c".into(),
        },
    ];
    update(
        &mut model,
        Message::Mouse(mouse(MouseEventKind::Down(MouseButton::Left), 3, 10)),
        &ctx,
    );
    if let ActiveView::Query(ref qv) = model.active_view {
        assert_eq!(
            qv.table_state.selected(),
            Some(1),
            "click should select row 1"
        );
    }
}

// ── Mouse: selection mode ─────────────────────────────────────────────────────
//
// 'v' is a global selection-mode toggle in Browsing mode (results visible).
// While the home palette is active, 'v' goes into the input buffer instead,
// so these tests first navigate to a results view to enter Browsing mode.

fn enter_browsing_with_results(model: &mut Model, ctx: &design_data_tui::UpdateCtx<'_>) {
    // Submit a query that produces results, which transitions the model to Browsing.
    update(
        model,
        Message::PaletteSubmit("query property=accent-color".into()),
        ctx,
    );
    assert!(
        !model.is_palette_open(),
        "should be in Browsing mode after query — expected palette closed with results"
    );
}

#[test]
fn v_key_enters_selection_mode() {
    let graph = make_graph_with_tokens(&["accent-color"]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    enter_browsing_with_results(&mut model, &ctx);
    update(&mut model, Message::Key(key(KeyCode::Char('v'))), &ctx);
    assert!(
        model.is_selection_mode_enabled(),
        "v should enable selection mode when in Browsing mode"
    );
}

#[test]
fn v_key_toggles_selection_mode_off() {
    let graph = make_graph_with_tokens(&["accent-color"]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    enter_browsing_with_results(&mut model, &ctx);
    update(&mut model, Message::Key(key(KeyCode::Char('v'))), &ctx);
    update(&mut model, Message::Key(key(KeyCode::Char('v'))), &ctx);
    assert!(
        !model.is_selection_mode_enabled(),
        "second v should disable selection mode"
    );
}

#[test]
fn drag_records_selection_endpoints() {
    let graph = make_graph_with_tokens(&["accent-color"]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    enter_browsing_with_results(&mut model, &ctx);
    update(&mut model, Message::Key(key(KeyCode::Char('v'))), &ctx);
    update(
        &mut model,
        Message::Mouse(mouse(MouseEventKind::Down(MouseButton::Left), 2, 0)),
        &ctx,
    );
    update(
        &mut model,
        Message::Mouse(mouse(MouseEventKind::Drag(MouseButton::Left), 4, 10)),
        &ctx,
    );
    assert_eq!(model.selection_start(), Some((2, 0)));
    assert_eq!(model.selection_end(), Some((4, 10)));
}

// ── Theming ───────────────────────────────────────────────────────────────────

#[test]
fn theme_terminal_has_reset_fg() {
    use ratatui::style::Color;
    let t = Theme::terminal();
    assert_eq!(
        t.fg,
        Color::Reset,
        "terminal theme fg should be Color::Reset"
    );
}

#[test]
fn theme_spectrum_overrides_accent() {
    use ratatui::style::Color;
    let t = Theme::spectrum();
    assert_eq!(
        t.accent,
        Color::Rgb(64, 70, 202),
        "spectrum theme accent should be Indigo 700"
    );
}

#[test]
fn theme_terminal_and_spectrum_differ() {
    let terminal = Theme::terminal();
    let spectrum = Theme::spectrum();
    assert_ne!(terminal.accent, spectrum.accent);
    assert_ne!(terminal.error, spectrum.error);
}
