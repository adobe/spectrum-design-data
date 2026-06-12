// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Unit tests for `model::views` — extracted to a file so the parent module
//! stays within the 800-LOC cap enforced by `tests/budget.rs` (GH #1018).

use super::{column_budget, truncate_cell};

// ── truncate_cell ─────────────────────────────────────────────────────────────

#[test]
fn truncate_cell_max_zero_passthrough() {
    assert_eq!(truncate_cell("hello", 0), "hello");
}

#[test]
fn truncate_cell_short_string_unchanged() {
    assert_eq!(truncate_cell("hi", 10), "hi");
}

#[test]
fn truncate_cell_exact_fit_no_ellipsis() {
    // 5 ASCII chars, max 5 — should pass through unchanged.
    assert_eq!(truncate_cell("abcde", 5), "abcde");
}

#[test]
fn truncate_cell_overflow_appends_ellipsis() {
    // 6 chars, max 5 → truncate to 4 + `…`
    let result = truncate_cell("abcdef", 5);
    assert_eq!(result, "abcd…");
}

#[test]
fn truncate_cell_multibyte_latin_unchanged() {
    // "café" is 4 display columns; max 5 → no truncation.
    assert_eq!(truncate_cell("café", 5), "café");
}

#[test]
fn truncate_cell_wide_chars_by_columns_not_chars() {
    // Each CJK char is 2 columns wide.
    // "日本語テスト" = 6 chars = 12 columns. max 5 → budget 4 cols → 2 CJK chars + `…`
    let result = truncate_cell("日本語テスト", 5);
    assert_eq!(result, "日本…");
}

#[test]
fn truncate_cell_wide_char_exactly_fits() {
    // 2 CJK chars = 4 display cols, max 4 → no truncation.
    assert_eq!(truncate_cell("日本", 4), "日本");
}

// ── column_budget ─────────────────────────────────────────────────────────────

#[test]
fn column_budget_typical_query_name_col() {
    // render_query: width 120, reserved 5, pct 40 → 46
    assert_eq!(column_budget(120, 5, 40), 46);
}

#[test]
fn column_budget_reserved_exceeds_width_saturates_to_zero() {
    // saturating_sub prevents underflow; result is 0 → truncate_cell passes through.
    assert_eq!(column_budget(4, 10, 40), 0);
}

// ── ValidateView grouping ─────────────────────────────────────────────────────

use super::{DiagnosticRow, ValidateView, VisibleRow};

fn row(rule: &str, token: &str, msg: &str) -> DiagnosticRow {
    DiagnosticRow {
        severity: "error".into(),
        rule_id: rule.into(),
        token: token.into(),
        message: msg.into(),
    }
}

#[test]
fn unique_rows_produce_one_group_per_row() {
    let vv = ValidateView::new(vec![
        row("R1", "t1", "msg1"),
        row("R2", "t2", "msg2"),
        row("R3", "t3", "msg3"),
    ]);
    assert_eq!(vv.groups.len(), 3);
    assert_eq!(vv.visible_len(), 3);
}

#[test]
fn duplicate_rule_message_collapses_to_one_group() {
    let vv = ValidateView::new(vec![
        row("SPEC-018", "token-a", "same msg"),
        row("SPEC-018", "token-b", "same msg"),
        row("SPEC-018", "token-c", "same msg"),
    ]);
    assert_eq!(vv.groups.len(), 1);
    assert_eq!(vv.groups[0].members.len(), 3);
    // Collapsed: only the header is visible.
    assert_eq!(vv.visible_len(), 1);
}

#[test]
fn groups_preserve_first_seen_order() {
    let vv = ValidateView::new(vec![
        row("R2", "ta", "msg-r2"),
        row("R1", "tb", "msg-r1"),
        row("R2", "tc", "msg-r2"),
    ]);
    assert_eq!(vv.groups.len(), 2);
    assert_eq!(vv.groups[0].rule_id, "R2");
    assert_eq!(vv.groups[1].rule_id, "R1");
}

#[test]
fn toggle_selected_expands_multi_member_group() {
    let mut vv = ValidateView::new(vec![
        row("SPEC-018", "t1", "msg"),
        row("SPEC-018", "t2", "msg"),
    ]);
    assert_eq!(vv.visible_len(), 1, "collapsed: 1 header");
    vv.toggle_selected();
    assert!(vv.groups[0].expanded);
    // header + 2 children
    assert_eq!(vv.visible_len(), 3);
}

#[test]
fn toggle_selected_collapses_back() {
    let mut vv = ValidateView::new(vec![
        row("SPEC-018", "t1", "msg"),
        row("SPEC-018", "t2", "msg"),
    ]);
    vv.toggle_selected(); // expand
    vv.toggle_selected(); // collapse
    assert!(!vv.groups[0].expanded);
    assert_eq!(vv.visible_len(), 1);
}

#[test]
fn toggle_selected_is_noop_for_singleton() {
    let mut vv = ValidateView::new(vec![row("R1", "t1", "msg")]);
    vv.toggle_selected();
    assert_eq!(vv.visible_len(), 1);
}

#[test]
fn toggle_selected_reselects_group_header_after_expand() {
    let mut vv = ValidateView::new(vec![
        row("SPEC-018", "t1", "msg"),
        row("SPEC-018", "t2", "msg"),
    ]);
    vv.toggle_selected(); // expand
                          // Selection should be on the Group header (index 0)
    assert_eq!(vv.table_state.selected(), Some(0));
    assert!(matches!(vv.visible[0], VisibleRow::Group(_)));
}

#[test]
fn selected_text_group_returns_message() {
    let vv = ValidateView::new(vec![row("R1", "tok", "the-message")]);
    assert_eq!(vv.selected_text(), Some("the-message".into()));
}

#[test]
fn selected_text_child_returns_token() {
    let mut vv = ValidateView::new(vec![
        row("SPEC-018", "tok-a", "msg"),
        row("SPEC-018", "tok-b", "msg"),
    ]);
    vv.toggle_selected(); // expand: visible = [Group(0), Child(0,0), Child(0,1)]
                          // Select child at position 1 (Child(0,0), token = "tok-a")
    vv.table_state.select(Some(1));
    assert_eq!(vv.selected_text(), Some("tok-a".into()));
}
