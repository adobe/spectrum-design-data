// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! View/data state types and the `Modal` enum. Extracted from `app.rs` to keep
//! source files within the 800-LOC budget enforced by `tests/budget.rs` (GH #1018).
//!
//! Also exports `layer_str` (moved here because `QueryRow::from_record` depends on
//! it) and the private `apply_scroll_delta` helper used by `Modal::on_scroll`.
//! `app.rs` re-exports everything here via `pub use crate::model::views::*;`.

use std::collections::HashMap;
use std::path::Path;

use design_data_core::cascade::ResolvedCandidate;
use design_data_core::diff::display_name;
use design_data_core::graph::{Layer, TokenGraph, TokenRecord};
use design_data_core::query::TokenIndex;
use design_data_core::schema::SchemaRegistry;
use ratatui::layout::Rect;
use ratatui::widgets::TableState;
use serde::{Deserialize, Serialize};

use crate::find::{FindScreen, FindWizardState};
use crate::naming::{NamingScreen, NamingWizardState};
use crate::wizard::{WizardScreen, WizardState};

// ── Constants ─────────────────────────────────────────────────────────────────

/// Max palette history entries persisted to disk.
pub(crate) const HISTORY_CAP: usize = 200;

// ── Palette / status types ────────────────────────────────────────────────────

/// The palette mode. Currently only command mode exists; the enum is kept for
/// future extensibility (e.g. a dedicated argument-completion mode).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PaletteMode {
    /// Command mode — the always-on palette on the home screen.
    Command,
}

/// Severity of a status bar message; controls render colour.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StatusKind {
    Info,
    Error,
}

/// A status bar message with its display kind.
#[derive(Debug, Clone)]
pub struct StatusMessage {
    pub text: String,
    pub kind: StatusKind,
}

impl StatusMessage {
    pub fn info(text: impl Into<String>) -> Self {
        Self {
            text: text.into(),
            kind: StatusKind::Info,
        }
    }
    pub fn error(text: impl Into<String>) -> Self {
        Self {
            text: text.into(),
            kind: StatusKind::Error,
        }
    }
}

// ── View state types ──────────────────────────────────────────────────────────

/// One row in the query results table.
#[derive(Debug, Clone)]
pub struct QueryRow {
    pub name: String,
    pub value: String,
    pub file: String,
    pub layer: String,
}

impl QueryRow {
    pub(crate) fn from_record(t: &TokenRecord) -> Self {
        let value = t
            .raw
            .get("value")
            .map(|v| {
                if v.is_string() {
                    v.as_str().unwrap_or("").to_string()
                } else {
                    v.to_string()
                }
            })
            .or_else(|| t.alias_target.clone())
            .unwrap_or_default();
        let file = t
            .file
            .file_name()
            .map(|f| f.to_string_lossy().into_owned())
            .unwrap_or_default();
        Self {
            name: display_name(t),
            value,
            file,
            layer: layer_str(t.layer).to_string(),
        }
    }
}

/// State for an active query view.
pub struct QueryView {
    pub expr_text: String,
    pub rows: Vec<QueryRow>,
    pub table_state: TableState,
    /// `true` when this view came from the `/` fuzzy-find palette rather than a
    /// `:query` expression. Controls only the rendered title label (`Fuzzy:` vs
    /// `Query:`); `expr_text` holds the raw search string either way.
    pub is_fuzzy: bool,
}

impl QueryView {
    pub fn new(expr_text: String, rows: Vec<QueryRow>) -> Self {
        Self::build(expr_text, rows, false)
    }

    /// Build a view for fuzzy-find results (titled `Fuzzy:` instead of `Query:`).
    pub fn fuzzy(query: String, rows: Vec<QueryRow>) -> Self {
        Self::build(query, rows, true)
    }

    fn build(expr_text: String, rows: Vec<QueryRow>, is_fuzzy: bool) -> Self {
        let mut table_state = TableState::default();
        if !rows.is_empty() {
            table_state.select(Some(0));
        }
        Self {
            expr_text,
            rows,
            table_state,
            is_fuzzy,
        }
    }

    pub(crate) fn selected_row(&self) -> Option<&QueryRow> {
        self.table_state.selected().and_then(|i| self.rows.get(i))
    }
}

/// One row in the resolve candidates table.
#[derive(Debug, Clone)]
pub struct ResolvedRow {
    pub name: String,
    pub value: String,
    pub file: String,
    pub layer: String,
    pub specificity: u32,
    pub is_winner: bool,
}

impl ResolvedRow {
    /// Map a core [`ResolvedCandidate`] into a TUI table row.
    pub fn from_candidate(c: &ResolvedCandidate) -> Self {
        let t = &c.record;
        let value = t
            .raw
            .get("value")
            .map(|v| {
                if v.is_string() {
                    v.as_str().unwrap_or("").to_string()
                } else {
                    v.to_string()
                }
            })
            .or_else(|| t.alias_target.clone())
            .unwrap_or_default();
        let file = t
            .file
            .file_name()
            .map(|f| f.to_string_lossy().into_owned())
            .unwrap_or_default();
        Self {
            name: display_name(t),
            value,
            file,
            layer: layer_str(t.layer).to_string(),
            specificity: c.specificity,
            is_winner: c.is_winner,
        }
    }
}

/// State for a resolve results view (winner + ranked candidates).
pub struct ResolveView {
    pub property: String,
    pub rows: Vec<ResolvedRow>,
    pub table_state: TableState,
}

impl ResolveView {
    pub(crate) fn new(property: String, rows: Vec<ResolvedRow>) -> Self {
        let mut table_state = TableState::default();
        if !rows.is_empty() {
            table_state.select(Some(0));
        }
        Self {
            property,
            rows,
            table_state,
        }
    }

    pub(crate) fn selected_row(&self) -> Option<&ResolvedRow> {
        self.table_state.selected().and_then(|i| self.rows.get(i))
    }
}

/// State for a component describe view.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DescribeView {
    pub component: String,
    pub pretty_json: String,
    pub scroll: u16,
}

/// One row in the validate diagnostics table.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiagnosticRow {
    pub severity: String,
    pub rule_id: String,
    pub token: String,
    pub message: String,
}

/// A group of diagnostics that share the same (rule_id, message) key.
pub struct ValidateGroup {
    pub rule_id: String,
    pub message: String,
    pub severity: String,
    /// Indices into `ValidateView::rows`.
    pub members: Vec<usize>,
    pub expanded: bool,
}

/// A projected visible row in the validate table — either a group header or an
/// expanded child showing an individual token.
pub enum VisibleRow {
    /// A group header; index into `ValidateView::groups`.
    Group(usize),
    /// An expanded child row; `(group_index, position_within_group.members)`.
    Child(usize, usize),
}

/// State for a validate findings view.
pub struct ValidateView {
    pub rows: Vec<DiagnosticRow>,
    pub groups: Vec<ValidateGroup>,
    pub visible: Vec<VisibleRow>,
    pub table_state: TableState,
}

impl ValidateView {
    pub fn new(rows: Vec<DiagnosticRow>) -> Self {
        let groups = Self::build_groups(&rows);
        let visible = Self::project_visible(&groups);
        let mut table_state = TableState::default();
        if !visible.is_empty() {
            table_state.select(Some(0));
        }
        Self {
            rows,
            groups,
            visible,
            table_state,
        }
    }

    fn build_groups(rows: &[DiagnosticRow]) -> Vec<ValidateGroup> {
        let mut map: HashMap<(String, String), usize> = HashMap::new();
        let mut groups: Vec<ValidateGroup> = Vec::new();
        for (i, row) in rows.iter().enumerate() {
            let key = (row.rule_id.clone(), row.message.clone());
            if let Some(&g) = map.get(&key) {
                groups[g].members.push(i);
            } else {
                let g = groups.len();
                map.insert(key, g);
                groups.push(ValidateGroup {
                    rule_id: row.rule_id.clone(),
                    message: row.message.clone(),
                    severity: row.severity.clone(),
                    members: vec![i],
                    expanded: false,
                });
            }
        }
        groups
    }

    fn project_visible(groups: &[ValidateGroup]) -> Vec<VisibleRow> {
        let mut visible = Vec::new();
        for (g, group) in groups.iter().enumerate() {
            visible.push(VisibleRow::Group(g));
            if group.expanded {
                for c in 0..group.members.len() {
                    visible.push(VisibleRow::Child(g, c));
                }
            }
        }
        visible
    }

    fn rebuild_visible(&mut self) {
        self.visible = Self::project_visible(&self.groups);
    }

    /// Number of currently visible rows (groups + any expanded children).
    pub fn visible_len(&self) -> usize {
        self.visible.len()
    }

    /// Toggle expand/collapse for the group at the currently selected visible row.
    /// Singletons (only one member) are a no-op. After rebuild, re-selects the
    /// group header so the cursor stays on the same group.
    pub(crate) fn toggle_selected(&mut self) {
        let sel = match self.table_state.selected() {
            Some(i) => i,
            None => return,
        };
        let group_idx = match self.visible.get(sel) {
            Some(VisibleRow::Group(g)) => *g,
            Some(VisibleRow::Child(g, _)) => *g,
            None => return,
        };
        if self.groups[group_idx].members.len() <= 1 {
            return;
        }
        self.groups[group_idx].expanded = !self.groups[group_idx].expanded;
        self.rebuild_visible();
        // Re-select the group header at its new position in the visible list.
        let new_sel = self
            .visible
            .iter()
            .position(|v| matches!(v, VisibleRow::Group(g) if *g == group_idx));
        self.table_state.select(new_sel);
    }

    /// Text to yank for the currently selected visible row.
    /// A group header yanks the message; a child row yanks the token.
    pub(crate) fn selected_text(&self) -> Option<String> {
        let sel = self.table_state.selected()?;
        match self.visible.get(sel)? {
            VisibleRow::Group(g) => Some(self.groups[*g].message.clone()),
            VisibleRow::Child(g, c) => {
                let row_idx = self.groups[*g].members[*c];
                Some(self.rows[row_idx].token.clone())
            }
        }
    }
}

/// Which view the active area is showing.
pub enum ActiveView {
    Empty,
    Query(QueryView),
    Resolve(ResolveView),
    Describe(DescribeView),
    Validate(ValidateView),
}

// ── Modals ────────────────────────────────────────────────────────────────────

/// State for the `?` help overlay.
pub struct HelpModal {
    pub scroll: u16,
}

/// An overlay modal that temporarily captures all keyboard input.
pub enum Modal {
    Find(Box<FindWizardState>),
    Wizard(Box<WizardState>),
    Naming(Box<NamingWizardState>),
    Help(HelpModal),
}

impl Modal {
    /// Whether mouse-wheel scroll events should be routed into this modal.
    ///
    /// Only `Wizard` (diff preview) and `Help` have scrollable content.
    /// New modals default to `false`; override by adding a variant here.
    pub fn wants_scroll(&self) -> bool {
        matches!(self, Modal::Wizard(_) | Modal::Help(_))
    }

    /// Route a scroll delta into this modal's scrollable region.
    ///
    /// Only called when `wants_scroll()` returns `true`.
    pub fn on_scroll(&mut self, delta: i32) {
        match self {
            Modal::Wizard(ws) => apply_scroll_delta(&mut ws.diff_scroll, delta),
            Modal::Help(hm) => apply_scroll_delta(&mut hm.scroll, delta),
            Modal::Find(_) | Modal::Naming(_) => {}
        }
    }

    /// Persist any in-progress state to disk (no-op for modals without persistence).
    pub fn persist(&self) {
        use crate::wizard::draft::{save_wizard_draft, to_draft};
        if let Modal::Wizard(ws) = self {
            save_wizard_draft(&to_draft(ws));
        }
    }

    /// One-line breadcrumb for the current screen, e.g. `"Step 1 of 2 — Filters"`.
    ///
    /// Intended for a future status-line indicator that shows which modal is open and
    /// which screen the user is on.  Not yet wired to a renderer.
    pub fn screen_label(&self) -> String {
        match self {
            Modal::Find(fs) => {
                let (n, name) = match fs.screen {
                    FindScreen::Filters => (1u8, "Filters"),
                    FindScreen::Preview => (2u8, "Preview"),
                };
                format!("Step {n} of 2 — {name}")
            }
            Modal::Naming(ns) => {
                let (n, name) = match ns.screen {
                    NamingScreen::Intent => (1u8, "Intent"),
                    NamingScreen::Classification => (2u8, "Classification"),
                    NamingScreen::Result => (3u8, "Result"),
                };
                format!("Step {n} of 3 — {name}")
            }
            Modal::Wizard(ws) => {
                let (n, total, name) = match ws.screen {
                    WizardScreen::Intent => (1u8, 4u8, "Intent"),
                    WizardScreen::Classification => (2, 4, "Classification"),
                    WizardScreen::Values => (3, 4, "Values"),
                    WizardScreen::Confirm => (4, 4, "Confirm"),
                };
                format!("Step {n} of {total} — {name}")
            }
            Modal::Help(_) => "Help".to_string(),
        }
    }
}

// ── Hit regions (mouse support) ───────────────────────────────────────────────

/// What clicking a region does.
pub enum HitAction {
    /// Selects a row in the active list or table view.
    SelectListRow(usize),
}

/// A rectangular region on screen with an associated action and text content.
pub struct HitRegion {
    pub rect: Rect,
    pub action: HitAction,
    /// Text representation of this element, used for drag-select copy.
    pub text: String,
}

// ── Submit context ────────────────────────────────────────────────────────────

/// Context passed to `submit_palette`; carries the graph plus optional paths for
/// describe and validate commands.
pub struct SubmitContext<'a> {
    pub graph: &'a TokenGraph,
    pub token_index: TokenIndex,
    pub mode_set_restrictions: HashMap<String, Vec<String>>,
    pub dataset_path: Option<&'a Path>,
    pub components_dir: Option<&'a Path>,
    pub schema_registry: Option<&'a SchemaRegistry>,
    pub mode_sets_dir: Option<&'a Path>,
}

impl<'a> SubmitContext<'a> {
    /// Minimal context for tests and use-cases that only need `:query`.
    pub fn new(graph: &'a TokenGraph) -> Self {
        Self {
            graph,
            token_index: TokenIndex::build(graph),
            mode_set_restrictions: HashMap::new(),
            dataset_path: None,
            components_dir: None,
            schema_registry: None,
            mode_sets_dir: None,
        }
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/// Map a `Layer` variant to a short display string.
pub(crate) fn layer_str(layer: Layer) -> &'static str {
    match layer {
        Layer::Foundation => "foundation",
        Layer::Platform => "platform",
        Layer::Product => "product",
    }
}

/// Truncate `s` to `max` terminal display columns, appending `…` when truncation
/// occurs. Width is measured with `unicode-width` so wide glyphs (CJK, emoji)
/// that occupy two terminal columns are accounted for correctly.
pub(crate) fn truncate_cell(s: &str, max: usize) -> String {
    use unicode_width::UnicodeWidthStr;
    if max == 0 || s.width() <= max {
        return s.to_owned();
    }
    let budget = max.saturating_sub(1); // reserve one column for `…`
    let mut out = String::new();
    let mut used = 0usize;
    for ch in s.chars() {
        let w = unicode_width::UnicodeWidthChar::width(ch).unwrap_or(0);
        if used + w > budget {
            break;
        }
        out.push(ch);
        used += w;
    }
    out.push('…');
    out
}

/// Compute a per-cell display-column budget for a table column.
///
/// `reserved` is the total number of terminal columns consumed by table borders,
/// inter-column gaps, and any fixed-width sibling columns (e.g. a `Length(2)`
/// star column) that are not covered by the `Percentage` constraints.
/// `pct` is the column's `Constraint::Percentage` value.
///
/// The result mirrors how ratatui distributes the remaining width so the ellipsis
/// in [`truncate_cell`] fires at roughly the real clip point.
pub(crate) fn column_budget(width: u16, reserved: u16, pct: u16) -> usize {
    (width.saturating_sub(reserved) as usize) * pct as usize / 100
}

/// `Constraint::Percentage` for the Name column in the query result table.
/// Also passed to [`column_budget`] (reserved = 5: 2 borders + 3 inter-column gaps)
/// so the budget call stays in sync with the actual layout if either is retuned.
pub(crate) const QUERY_NAME_PCT: u16 = 40;

/// `Constraint::Percentage` for the Name column in the resolve result table.
/// Also passed to [`column_budget`] (reserved = 9: 2 borders + 5 gaps + 2-wide star column).
pub(crate) const RESOLVE_NAME_PCT: u16 = 35;

/// `Constraint::Percentage` for the Token column in the validate result table.
/// Also passed to [`column_budget`] (reserved = 12: 2 borders + 3 gaps + 7-wide Sev column).
pub(crate) const VALIDATE_TOKEN_PCT: u16 = 28;

/// Apply a signed scroll delta to a `u16` scroll position using saturating arithmetic.
fn apply_scroll_delta(scroll: &mut u16, delta: i32) {
    if delta > 0 {
        *scroll = scroll.saturating_add(delta as u16);
    } else {
        *scroll = scroll.saturating_sub((-delta) as u16);
    }
}

#[cfg(test)]
mod tests {
    use super::{column_budget, truncate_cell};

    // ── truncate_cell ─────────────────────────────────────────────────────────

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

    // ── column_budget ─────────────────────────────────────────────────────────

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

    // ── ValidateView grouping ─────────────────────────────────────────────────

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
}
