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

use std::env;
use std::sync::Mutex;

use crossterm::event::{
    KeyCode, KeyEvent, KeyEventKind, KeyEventState, KeyModifiers, MouseButton, MouseEvent,
    MouseEventKind,
};
use design_data_core::graph::TokenGraph;
use design_data_tui::app::{App, HitAction, HitRegion, Modal};
use design_data_tui::theme::Theme;
use design_data_tui::wizard::WizardCtx;
use ratatui::layout::Rect;
use tempfile::TempDir;

// ── Helpers ───────────────────────────────────────────────────────────────────

fn key(code: KeyCode) -> KeyEvent {
    KeyEvent {
        code,
        modifiers: KeyModifiers::NONE,
        kind: KeyEventKind::Press,
        state: KeyEventState::NONE,
    }
}

fn mouse(kind: MouseEventKind, row: u16, col: u16) -> MouseEvent {
    MouseEvent { kind, row, column: col, modifiers: KeyModifiers::NONE }
}

fn empty_ctx(graph: &TokenGraph) -> WizardCtx<'_> {
    WizardCtx { graph, dataset_path: None, schema_registry: None, allow_write: false }
}

fn open_palette(app: &mut App) {
    app.handle_key(key(KeyCode::Char(':')));
}

// ── Help overlay ──────────────────────────────────────────────────────────────

#[test]
fn question_mark_opens_help_modal() {
    let mut app = App::new();
    app.handle_key(key(KeyCode::Char('?')));
    assert!(matches!(app.modal, Some(Modal::Help(_))), "? should open help modal");
}

#[test]
fn esc_closes_help_modal() {
    let graph = TokenGraph::default();
    let mut app = App::new();
    app.handle_key(key(KeyCode::Char('?')));
    app.handle_modal_key(key(KeyCode::Esc), &empty_ctx(&graph));
    assert!(app.modal.is_none(), "Esc should close help modal");
}

#[test]
fn question_mark_closes_help_modal() {
    let graph = TokenGraph::default();
    let mut app = App::new();
    app.handle_key(key(KeyCode::Char('?')));
    app.handle_modal_key(key(KeyCode::Char('?')), &empty_ctx(&graph));
    assert!(app.modal.is_none(), "second ? should close help modal");
}

#[test]
fn pgdn_scrolls_help_body() {
    let graph = TokenGraph::default();
    let mut app = App::new();
    app.handle_key(key(KeyCode::Char('?')));
    app.handle_modal_key(key(KeyCode::PageDown), &empty_ctx(&graph));
    if let Some(Modal::Help(ref hm)) = app.modal {
        assert_eq!(hm.scroll, 10, "PageDown should advance help scroll by 10");
    } else {
        panic!("expected Help modal to still be open");
    }
}

#[test]
fn arrow_keys_scroll_help_body() {
    let graph = TokenGraph::default();
    let mut app = App::new();
    app.handle_key(key(KeyCode::Char('?')));
    let ctx = empty_ctx(&graph);
    app.handle_modal_key(key(KeyCode::Down), &ctx);
    app.handle_modal_key(key(KeyCode::Down), &ctx);
    app.handle_modal_key(key(KeyCode::Up), &ctx);
    if let Some(Modal::Help(ref hm)) = app.modal {
        assert_eq!(hm.scroll, 1);
    } else {
        panic!("expected Help modal");
    }
}

// ── Palette history ───────────────────────────────────────────────────────────

// Serialize env-touching tests to avoid DESIGN_DATA_TUI_HISTORY stomping across
// concurrently running tests (cargo test runs in parallel by default).
static HISTORY_ENV_LOCK: Mutex<()> = Mutex::new(());

fn with_temp_history<F: FnOnce()>(f: F) -> TempDir {
    let dir = TempDir::new().unwrap();
    let history_path = dir.path().join("history");
    let _guard = HISTORY_ENV_LOCK.lock().unwrap();
    env::set_var("DESIGN_DATA_TUI_HISTORY", &history_path);
    f();
    env::remove_var("DESIGN_DATA_TUI_HISTORY");
    dir
}

#[test]
fn submit_palette_appends_to_history() {
    let _dir = with_temp_history(|| {
        let mut app = App::new();
        open_palette(&mut app);
        for ch in "query *".chars() {
            app.handle_key(key(KeyCode::Char(ch)));
        }
        app.handle_key(key(KeyCode::Enter));
        let graph = TokenGraph::default();
        let ctx = design_data_tui::app::SubmitContext::new(&graph);
        app.submit_palette(&ctx);

        assert_eq!(app.palette_history.first().map(|s| s.as_str()), Some("query *"));
    });
}

#[test]
fn up_arrow_in_palette_recalls_last_command() {
    let _dir = with_temp_history(|| {
        let mut app = App::new();
        app.palette_history = vec!["query foo".to_string(), "query bar".to_string()];

        open_palette(&mut app);
        app.handle_key(key(KeyCode::Up));
        assert_eq!(app.palette_input.value(), "query foo");

        app.handle_key(key(KeyCode::Up));
        assert_eq!(app.palette_input.value(), "query bar");

        app.handle_key(key(KeyCode::Down));
        assert_eq!(app.palette_input.value(), "query foo");
    });
}

#[test]
fn history_dedupes_consecutive_duplicates() {
    let _dir = with_temp_history(|| {
        let mut app = App::new();
        app.palette_history = vec!["query *".to_string()];
        open_palette(&mut app);
        for ch in "query *".chars() {
            app.handle_key(key(KeyCode::Char(ch)));
        }
        app.handle_key(key(KeyCode::Enter));
        let graph = TokenGraph::default();
        let ctx = design_data_tui::app::SubmitContext::new(&graph);
        app.submit_palette(&ctx);

        assert_eq!(app.palette_history.len(), 1, "same command should not be duplicated");
    });
}

#[test]
fn history_caps_at_200_entries() {
    let _dir = with_temp_history(|| {
        let mut app = App::new();
        app.palette_history = (0..199).map(|i| format!("query token-{i}")).collect();

        open_palette(&mut app);
        for ch in "query new-token".chars() {
            app.handle_key(key(KeyCode::Char(ch)));
        }
        app.handle_key(key(KeyCode::Enter));
        let graph = TokenGraph::default();
        let ctx = design_data_tui::app::SubmitContext::new(&graph);
        app.submit_palette(&ctx);

        assert_eq!(app.palette_history.len(), 200);
        assert_eq!(app.palette_history[0], "query new-token");
    });
}

#[test]
fn typing_resets_history_cursor() {
    let _dir = with_temp_history(|| {
        let mut app = App::new();
        app.palette_history = vec!["query foo".to_string(), "query bar".to_string()];

        open_palette(&mut app);
        app.handle_key(key(KeyCode::Up)); // cursor = Some(0)
        assert_eq!(app.palette_history_cursor, Some(0));

        // Type a character — cursor must reset so the next ↑ starts from head.
        app.handle_key(key(KeyCode::Char('x')));
        assert_eq!(app.palette_history_cursor, None, "typing should reset history cursor");

        // Pressing ↑ again should return to index 0 (newest entry), not continue from 1.
        app.handle_key(key(KeyCode::Up));
        assert_eq!(app.palette_history_cursor, Some(0));
        assert_eq!(app.palette_input.value(), "query foo");
    });
}

// ── Mouse: wheel scroll ───────────────────────────────────────────────────────

#[test]
fn wheel_scroll_down_increments_describe_scroll() {
    use design_data_tui::app::ActiveView;
    let mut app = App::new();
    app.active_view = ActiveView::Describe(design_data_tui::app::DescribeView {
        component: "button".to_string(),
        pretty_json: "{}".to_string(),
        scroll: 0,
    });
    app.handle_mouse(mouse(MouseEventKind::ScrollDown, 5, 5));
    if let ActiveView::Describe(ref dv) = app.active_view {
        assert!(dv.scroll > 0, "scroll down should advance describe scroll");
    }
}

// ── Mouse: click via hit regions ──────────────────────────────────────────────

#[test]
fn click_on_hit_region_selects_row() {
    use design_data_tui::app::{ActiveView, QueryRow, QueryView};
    let mut app = App::new();
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
    app.active_view = ActiveView::Query(QueryView::new("*".to_string(), rows));

    app.hit_regions = vec![
        HitRegion {
            rect: Rect { x: 0, y: 2, width: 80, height: 1 },
            action: HitAction::SelectListRow(0),
            text: "a".into(),
        },
        HitRegion {
            rect: Rect { x: 0, y: 3, width: 80, height: 1 },
            action: HitAction::SelectListRow(1),
            text: "b".into(),
        },
        HitRegion {
            rect: Rect { x: 0, y: 4, width: 80, height: 1 },
            action: HitAction::SelectListRow(2),
            text: "c".into(),
        },
    ];

    // Click row 1 (y=3).
    app.handle_mouse(mouse(MouseEventKind::Down(MouseButton::Left), 3, 10));
    if let ActiveView::Query(ref qv) = app.active_view {
        assert_eq!(qv.table_state.selected(), Some(1), "click should select row 1");
    }
}

// ── Mouse: selection mode ─────────────────────────────────────────────────────

#[test]
fn v_key_enters_selection_mode() {
    let mut app = App::new();
    app.handle_key(key(KeyCode::Char('v')));
    assert!(app.selection_mode, "v should enable selection mode");
}

#[test]
fn v_key_toggles_selection_mode_off() {
    let mut app = App::new();
    app.handle_key(key(KeyCode::Char('v')));
    app.handle_key(key(KeyCode::Char('v')));
    assert!(!app.selection_mode, "second v should disable selection mode");
}

#[test]
fn drag_records_selection_endpoints() {
    let mut app = App::new();
    app.handle_key(key(KeyCode::Char('v')));
    app.handle_mouse(mouse(MouseEventKind::Down(MouseButton::Left), 2, 0));
    app.handle_mouse(mouse(MouseEventKind::Drag(MouseButton::Left), 4, 10));
    assert_eq!(app.sel_start, Some((2, 0)));
    assert_eq!(app.sel_end, Some((4, 10)));
}

// ── Theming ───────────────────────────────────────────────────────────────────

#[test]
fn theme_terminal_has_reset_fg() {
    use ratatui::style::Color;
    let t = Theme::terminal();
    assert_eq!(t.fg, Color::Reset, "terminal theme fg should be Color::Reset");
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
