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
use common::{key, settle, update_ctx, update_ctx_builder};

use crossterm::event::KeyCode;
use design_data_core::graph::{ComponentRecord, TokenGraph};
use design_data_tui::app::{ActiveView, DescribeView};
use design_data_tui::{update, Message, Model, UpdateCtx};
use serde_json::json;
use std::path::{Path, PathBuf};

fn fixtures_components_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/components")
}

fn make_graph_with_components() -> TokenGraph {
    let comps = vec![ComponentRecord {
        name: "button".into(),
        file: fixtures_components_dir().join("button.json"),
        raw: json!({"name": "button", "description": "A clickable button."}),
    }];
    TokenGraph::default().with_components(comps)
}

fn describe_ctx<'a>(graph: &'a TokenGraph, dir: &'a Path) -> UpdateCtx<'a> {
    update_ctx_builder(graph).components_dir(dir).build()
}

fn submit_describe(model: &mut Model, ctx: &UpdateCtx<'_>, id: &str) {
    // `describe` completes via a Task (DescribeDone) — use `settle` to run the
    // FS read and settle the view before asserting.
    settle(model, Message::PaletteSubmit(format!("describe {id}")), ctx);
}

#[test]
fn describe_known_component_returns_describe_view() {
    let graph = make_graph_with_components();
    let dir = fixtures_components_dir();
    let ctx = describe_ctx(&graph, &dir);
    let mut model = Model::new();
    submit_describe(&mut model, &ctx, "button");
    assert!(
        matches!(model.active_view, ActiveView::Describe(_)),
        "expected Describe view"
    );
}

#[test]
fn describe_view_has_nonempty_json() {
    let graph = make_graph_with_components();
    let dir = fixtures_components_dir();
    let ctx = describe_ctx(&graph, &dir);
    let mut model = Model::new();
    submit_describe(&mut model, &ctx, "button");
    if let ActiveView::Describe(ref dv) = model.active_view {
        assert!(!dv.pretty_json.is_empty(), "expected non-empty JSON");
        assert_eq!(dv.component, "button");
    } else {
        panic!("expected Describe view");
    }
}

#[test]
fn describe_unknown_component_sets_error_status() {
    let graph = make_graph_with_components();
    let dir = fixtures_components_dir();
    let ctx = describe_ctx(&graph, &dir);
    let mut model = Model::new();
    submit_describe(&mut model, &ctx, "nonexistent");
    assert!(matches!(model.active_view, ActiveView::Empty));
    let msg = model
        .status_message
        .as_ref()
        .map(|m| m.text.as_str())
        .unwrap_or("");
    assert!(
        msg.contains("not found"),
        "expected 'not found' in error message: {msg}"
    );
}

#[test]
fn describe_unknown_with_components_suggests_match() {
    let graph = make_graph_with_components();
    let dir = fixtures_components_dir();
    let ctx = describe_ctx(&graph, &dir);
    let mut model = Model::new();
    submit_describe(&mut model, &ctx, "but");
    let msg = model
        .status_message
        .as_ref()
        .map(|m| m.text.as_str())
        .unwrap_or("");
    assert!(
        msg.contains("button"),
        "expected suggestion for 'button' in: {msg}"
    );
}

#[test]
fn describe_invalid_id_sets_error_status() {
    let graph = make_graph_with_components();
    let dir = fixtures_components_dir();
    let ctx = describe_ctx(&graph, &dir);
    let mut model = Model::new();
    submit_describe(&mut model, &ctx, "Button");
    let msg = model
        .status_message
        .as_ref()
        .map(|m| m.text.as_str())
        .unwrap_or("");
    assert!(msg.contains("invalid"), "expected 'invalid' in: {msg}");
}

#[test]
fn describe_no_components_dir_sets_error_status() {
    let graph = TokenGraph::default();
    let ctx = UpdateCtx::minimal(&graph);
    let mut model = Model::new();
    update(
        &mut model,
        Message::PaletteSubmit("describe button".into()),
        &ctx,
    );
    let msg = model
        .status_message
        .as_ref()
        .map(|m| m.text.as_str())
        .unwrap_or("");
    assert!(
        msg.contains("no components directory"),
        "expected 'no components directory': {msg}"
    );
}

#[test]
fn describe_selection_changes_with_pgdn_pgup() {
    let graph = make_graph_with_components();
    let dir = fixtures_components_dir();
    let ctx = describe_ctx(&graph, &dir);
    let mut model = Model::new();
    submit_describe(&mut model, &ctx, "button");
    update(&mut model, Message::Key(key(KeyCode::PageDown)), &ctx);
    if let ActiveView::Describe(ref dv) = model.active_view {
        assert!(dv.selected > 0, "selected should advance with PgDn");
    } else {
        panic!("expected Describe view");
    }
    update(&mut model, Message::Key(key(KeyCode::PageUp)), &ctx);
    if let ActiveView::Describe(ref dv) = model.active_view {
        assert_eq!(dv.selected, 0, "selected should return to 0 after PgUp");
    } else {
        panic!("expected Describe view");
    }
}

#[test]
fn esc_from_describe_view_returns_to_empty() {
    let graph = make_graph_with_components();
    let dir = fixtures_components_dir();
    let ctx = describe_ctx(&graph, &dir);
    let mut model = Model::new();
    submit_describe(&mut model, &ctx, "button");
    assert!(matches!(model.active_view, ActiveView::Describe(_)));
    update(&mut model, Message::Key(key(KeyCode::Esc)), &ctx);
    assert!(matches!(model.active_view, ActiveView::Empty));
}

// ── g/G scroll ────────────────────────────────────────────────────────────────

/// Build a DescribeView with enough lines to make G scrolling observable.
fn wide_describe() -> DescribeView {
    // A single long line (200 chars) to exercise horizontal scroll.
    let long_value = "x".repeat(200);
    DescribeView {
        component: "wide".to_string(),
        pretty_json: format!("{{ \"content\": \"{long_value}\" }}"),
        scroll: 0,
        h_scroll: 0,
        selected: 0,
    }
}

fn multi_line_describe() -> DescribeView {
    let json = (0..30)
        .map(|i| format!("  \"line{i}\": {i}"))
        .collect::<Vec<_>>()
        .join(",\n");
    DescribeView {
        component: "test".to_string(),
        pretty_json: format!("{{\n{json}\n}}"),
        scroll: 0,
        h_scroll: 0,
        selected: 0,
    }
}

#[test]
fn g_key_moves_selection_to_top() {
    use design_data_core::graph::TokenGraph;
    let graph = TokenGraph::default();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    model.active_view = ActiveView::Describe(multi_line_describe());
    model.close_palette(); // palette must be closed for view-key routing
                           // Advance selection, then jump back to top.
    update(&mut model, Message::Key(key(KeyCode::PageDown)), &ctx);
    update(&mut model, Message::Key(key(KeyCode::Char('g'))), &ctx);
    if let ActiveView::Describe(ref dv) = model.active_view {
        assert_eq!(dv.selected, 0, "g should move selection to top");
        assert_eq!(dv.scroll, 0, "g should also reset scroll to 0");
    } else {
        panic!("expected Describe view");
    }
}

#[test]
fn shift_g_key_moves_selection_to_bottom() {
    use design_data_core::graph::TokenGraph;
    let graph = TokenGraph::default();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    model.active_view = ActiveView::Describe(multi_line_describe());
    model.close_palette(); // palette must be closed for view-key routing
    update(&mut model, Message::Key(key(KeyCode::Char('G'))), &ctx);
    if let ActiveView::Describe(ref dv) = model.active_view {
        // multi_line_describe() has 32 lines ({, 30 content lines, })
        assert!(
            dv.selected > 0,
            "G should move selection toward bottom (got selected={})",
            dv.selected
        );
    } else {
        panic!("expected Describe view");
    }
}

#[test]
fn l_key_advances_h_scroll_by_4() {
    let graph = TokenGraph::default();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    model.active_view = ActiveView::Describe(wide_describe());
    model.close_palette();
    update(&mut model, Message::Key(key(KeyCode::Char('l'))), &ctx);
    if let ActiveView::Describe(ref dv) = model.active_view {
        assert_eq!(dv.h_scroll, 4, "l should advance h_scroll by 4");
    } else {
        panic!("expected Describe view");
    }
}

#[test]
fn h_key_decrements_h_scroll() {
    let graph = TokenGraph::default();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    let mut dv = wide_describe();
    dv.h_scroll = 8;
    model.active_view = ActiveView::Describe(dv);
    model.close_palette();
    update(&mut model, Message::Key(key(KeyCode::Char('h'))), &ctx);
    if let ActiveView::Describe(ref dv) = model.active_view {
        assert_eq!(dv.h_scroll, 4, "h should decrement h_scroll by 4");
    } else {
        panic!("expected Describe view");
    }
}

#[test]
fn g_key_resets_selection_scroll_and_h_scroll() {
    let graph = TokenGraph::default();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    let mut dv = wide_describe();
    dv.selected = 3;
    dv.scroll = 5;
    dv.h_scroll = 12;
    model.active_view = ActiveView::Describe(dv);
    model.close_palette();
    update(&mut model, Message::Key(key(KeyCode::Char('g'))), &ctx);
    if let ActiveView::Describe(ref dv) = model.active_view {
        assert_eq!(dv.selected, 0, "g should reset selection to 0");
        assert_eq!(dv.scroll, 0, "g should reset vertical scroll to 0");
        assert_eq!(dv.h_scroll, 0, "g should reset horizontal scroll to 0");
    } else {
        panic!("expected Describe view");
    }
}

// ── Arrow-key aliases ─────────────────────────────────────────────────────────

#[test]
fn right_arrow_advances_h_scroll_like_l() {
    let graph = TokenGraph::default();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    model.active_view = ActiveView::Describe(wide_describe());
    model.close_palette();
    update(&mut model, Message::Key(key(KeyCode::Right)), &ctx);
    if let ActiveView::Describe(ref dv) = model.active_view {
        assert_eq!(dv.h_scroll, 4, "Right arrow should advance h_scroll by 4");
    } else {
        panic!("expected Describe view");
    }
}

#[test]
fn left_arrow_decrements_h_scroll_like_h() {
    let graph = TokenGraph::default();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    let mut dv = wide_describe();
    dv.h_scroll = 8;
    model.active_view = ActiveView::Describe(dv);
    model.close_palette();
    update(&mut model, Message::Key(key(KeyCode::Left)), &ctx);
    if let ActiveView::Describe(ref dv) = model.active_view {
        assert_eq!(dv.h_scroll, 4, "Left arrow should decrement h_scroll by 4");
    } else {
        panic!("expected Describe view");
    }
}

// ── Saturation boundaries ─────────────────────────────────────────────────────

#[test]
fn h_key_at_zero_stays_zero() {
    let graph = TokenGraph::default();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    model.active_view = ActiveView::Describe(wide_describe()); // h_scroll starts at 0
    model.close_palette();
    update(&mut model, Message::Key(key(KeyCode::Char('h'))), &ctx);
    if let ActiveView::Describe(ref dv) = model.active_view {
        assert_eq!(dv.h_scroll, 0, "h at 0 should stay at 0 (saturating_sub)");
    } else {
        panic!("expected Describe view");
    }
}

#[test]
fn l_key_clamps_at_max_line_width() {
    let graph = TokenGraph::default();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    let mut dv = wide_describe();
    // Seed h_scroll at u16::MAX - 1, one step below the overflow boundary.
    // With plain `+` this would overflow on the +4 add before `.min()` runs.
    // With saturating_add it must clamp at max_line_width - 1 instead.
    // wide_describe() produces one line: `{ "content": "<200 x's>" }` = 217 display
    // columns, so max_line_width() == 217 and the cap is 216.
    dv.h_scroll = u16::MAX - 1;
    model.active_view = ActiveView::Describe(dv);
    model.close_palette();
    update(&mut model, Message::Key(key(KeyCode::Char('l'))), &ctx);
    if let ActiveView::Describe(ref dv) = model.active_view {
        assert_eq!(
            dv.h_scroll, 216,
            "l should clamp h_scroll at max_line_width - 1 (got {})",
            dv.h_scroll
        );
    } else {
        panic!("expected Describe view");
    }
}

// ── Shift-G resets h_scroll ───────────────────────────────────────────────────

#[test]
fn shift_g_resets_h_scroll_to_zero() {
    let graph = TokenGraph::default();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    let mut dv = wide_describe();
    dv.selected = 0;
    dv.scroll = 0;
    dv.h_scroll = 16;
    model.active_view = ActiveView::Describe(dv);
    model.close_palette();
    update(&mut model, Message::Key(key(KeyCode::Char('G'))), &ctx);
    if let ActiveView::Describe(ref dv) = model.active_view {
        assert_eq!(dv.h_scroll, 0, "G should reset h_scroll to 0");
    } else {
        panic!("expected Describe view");
    }
}

// ── Unicode display-column width ──────────────────────────────────────────────

/// Build a DescribeView whose longest line consists of wide (CJK) glyphs.
/// "宽" is 1 char but 2 terminal display columns.  Ten of them == 20 display cols.
/// Wrapped in minimal JSON that keeps the line as the widest one: `{"v":"宽宽…"}`.
/// The full line is ~28 display columns wide (14 ASCII + 20 CJK = 34 cols).
fn cjk_describe() -> DescribeView {
    let wide_chars = "宽".repeat(10); // 10 chars, 20 display columns
    DescribeView {
        component: "cjk".to_string(),
        pretty_json: format!("{{ \"v\": \"{wide_chars}\" }}"),
        scroll: 0,
        h_scroll: 0,
        selected: 0,
    }
}

#[test]
fn l_scroll_cap_respects_display_columns_not_char_count() {
    // If the cap used chars().count() it would stop at 13 (the ASCII wrapper chars).
    // With unicode-width it stops at ~33 (14 ASCII + 20 CJK display cols - 1).
    // Seed h_scroll at a value that chars().count() would clamp to but
    // display-column width would not, then press 'l' and confirm we advance.
    let graph = TokenGraph::default();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    let mut dv = cjk_describe();
    // chars().count() of the whole line is ~14; set h_scroll just above that.
    // A display-column-aware cap (~33) should still allow advancement.
    dv.h_scroll = 14;
    model.active_view = ActiveView::Describe(dv);
    model.close_palette();
    update(&mut model, Message::Key(key(KeyCode::Char('l'))), &ctx);
    if let ActiveView::Describe(ref dv) = model.active_view {
        assert!(
            dv.h_scroll > 14,
            "l should advance past the char-count ceiling ({}); display-col cap is higher",
            dv.h_scroll
        );
    } else {
        panic!("expected Describe view");
    }
}

// ── Row selection movement ────────────────────────────────────────────────────

#[test]
fn j_key_advances_selection_by_one() {
    let graph = TokenGraph::default();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    model.active_view = ActiveView::Describe(multi_line_describe());
    model.close_palette();
    update(&mut model, Message::Key(key(KeyCode::Char('j'))), &ctx);
    if let ActiveView::Describe(ref dv) = model.active_view {
        assert_eq!(dv.selected, 1, "j should advance selection by 1");
    } else {
        panic!("expected Describe view");
    }
}

#[test]
fn k_key_decrements_selection_by_one() {
    let graph = TokenGraph::default();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    let mut dv = multi_line_describe();
    dv.selected = 5;
    model.active_view = ActiveView::Describe(dv);
    model.close_palette();
    update(&mut model, Message::Key(key(KeyCode::Char('k'))), &ctx);
    if let ActiveView::Describe(ref dv) = model.active_view {
        assert_eq!(dv.selected, 4, "k should decrement selection by 1");
    } else {
        panic!("expected Describe view");
    }
}

#[test]
fn selection_clamps_at_top() {
    let graph = TokenGraph::default();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    model.active_view = ActiveView::Describe(multi_line_describe()); // selected=0
    model.close_palette();
    update(&mut model, Message::Key(key(KeyCode::Up)), &ctx);
    if let ActiveView::Describe(ref dv) = model.active_view {
        assert_eq!(dv.selected, 0, "Up at top should stay at 0 (saturating)");
    } else {
        panic!("expected Describe view");
    }
}

#[test]
fn selection_clamps_at_bottom() {
    let graph = TokenGraph::default();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    // multi_line_describe() produces 32 lines: '{', 30 content, '}'
    let mut dv = multi_line_describe();
    let last = dv.line_count() - 1;
    dv.selected = last;
    model.active_view = ActiveView::Describe(dv);
    model.close_palette();
    update(&mut model, Message::Key(key(KeyCode::Down)), &ctx);
    if let ActiveView::Describe(ref dv) = model.active_view {
        assert_eq!(
            dv.selected, last,
            "Down at bottom should clamp at last line"
        );
    } else {
        panic!("expected Describe view");
    }
}

// ── y / Y yank ────────────────────────────────────────────────────────────────

#[test]
fn y_yanks_selected_line() {
    let graph = TokenGraph::default();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    let dv = multi_line_describe();
    // Move to line 1 to avoid a trivially empty selection on line 0 ('{').
    let expected_text = dv.pretty_json.lines().nth(1).unwrap().to_string();
    let mut dv = dv;
    dv.selected = 1;
    model.active_view = ActiveView::Describe(dv);
    model.close_palette();
    let task = update(&mut model, Message::Key(key(KeyCode::Char('y'))), &ctx);
    assert!(
        task.is_cmd(),
        "'y' should return Task::Cmd for clipboard write"
    );
    assert!(
        model.pending_yank.is_none(),
        "pending_yank should be drained"
    );
    // Verify the helper returns the expected text before the yank.
    if let ActiveView::Describe(ref dv) = model.active_view {
        // After yank the selected line is unchanged — check the helper directly.
        assert_eq!(
            dv.selected_text(),
            expected_text,
            "selected_text() should return the highlighted line"
        );
    }
}

#[test]
fn shift_y_yanks_full_document() {
    let graph = TokenGraph::default();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    let dv = multi_line_describe();
    let full = dv.pretty_json.clone();
    model.active_view = ActiveView::Describe(dv);
    model.close_palette();
    let task = update(&mut model, Message::Key(key(KeyCode::Char('Y'))), &ctx);
    assert!(
        task.is_cmd(),
        "'Y' should return Task::Cmd for clipboard write"
    );
    assert!(
        model.pending_yank.is_none(),
        "pending_yank should be drained"
    );
    if let ActiveView::Describe(ref dv) = model.active_view {
        assert_eq!(dv.pretty_json, full, "Y should yank pretty_json");
    }
}

#[test]
fn shift_y_does_nothing_outside_describe() {
    let graph = TokenGraph::default();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    // ActiveView::Empty — Y should return Task::none().
    update(&mut model, Message::Key(key(KeyCode::Char('Y'))), &ctx);
    assert!(
        model.pending_yank.is_none(),
        "Y outside Describe should not set pending_yank"
    );
}
