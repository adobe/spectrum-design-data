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
//! `app.rs` re-exports everything here via `pub use crate::app_views::*;`.

use std::collections::HashMap;
use std::path::Path;

use design_data_core::cascade::ResolvedCandidate;
use design_data_core::diff::display_name;
use design_data_core::graph::{Layer, TokenGraph, TokenRecord};
use design_data_core::query::TokenIndex;
use design_data_core::schema::SchemaRegistry;
use ratatui::layout::Rect;
use ratatui::widgets::TableState;

use crate::find::{FindScreen, FindWizardState};
use crate::naming::{NamingScreen, NamingWizardState};
use crate::wizard::{WizardScreen, WizardState};

// ── Constants ─────────────────────────────────────────────────────────────────

/// Command names for Tab autocomplete.
pub(crate) const KNOWN_COMMANDS: &[&str] = &[
    "find", "name", "new", "query", "resolve", "describe", "validate",
];

/// Max palette history entries persisted to disk.
pub(crate) const HISTORY_CAP: usize = 200;

// ── Palette / status types ────────────────────────────────────────────────────

/// Which prefix the palette was opened with.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PaletteMode {
    /// `:` — explicit command mode.
    Command,
    /// `/` — fuzzy-find mode.
    FuzzyFind,
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
}

impl QueryView {
    pub fn new(expr_text: String, rows: Vec<QueryRow>) -> Self {
        let mut table_state = TableState::default();
        if !rows.is_empty() {
            table_state.select(Some(0));
        }
        Self {
            expr_text,
            rows,
            table_state,
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
pub struct DescribeView {
    pub component: String,
    pub pretty_json: String,
    pub scroll: u16,
}

/// One row in the validate diagnostics table.
#[derive(Debug, Clone)]
pub struct DiagnosticRow {
    pub severity: String,
    pub rule_id: String,
    pub token: String,
    pub message: String,
}

/// State for a validate findings view.
pub struct ValidateView {
    pub rows: Vec<DiagnosticRow>,
    pub table_state: TableState,
}

impl ValidateView {
    pub(crate) fn new(rows: Vec<DiagnosticRow>) -> Self {
        let mut table_state = TableState::default();
        if !rows.is_empty() {
            table_state.select(Some(0));
        }
        Self { rows, table_state }
    }

    pub(crate) fn selected_row(&self) -> Option<&DiagnosticRow> {
        self.table_state.selected().and_then(|i| self.rows.get(i))
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
        use crate::wizard_draft::{save_wizard_draft, to_draft};
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

/// Apply a signed scroll delta to a `u16` scroll position using saturating arithmetic.
fn apply_scroll_delta(scroll: &mut u16, delta: i32) {
    if delta > 0 {
        *scroll = scroll.saturating_add(delta as u16);
    } else {
        *scroll = scroll.saturating_sub((-delta) as u16);
    }
}
