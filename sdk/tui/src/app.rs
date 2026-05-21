// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

use std::collections::HashSet;
use std::path::{Path, PathBuf};

use crossterm::event::{KeyCode, KeyEvent, KeyModifiers, MouseButton, MouseEvent, MouseEventKind};
use design_data_core::cascade::{self, ResolutionContext, specificity};
use design_data_core::diff::display_name;
use design_data_core::graph::{Layer, TokenGraph, TokenRecord};
use design_data_core::query;
use design_data_core::schema::SchemaRegistry;
use design_data_core::validate;
use ratatui::layout::Rect;
use ratatui::widgets::TableState;
use tui_input::Input;
use tui_input::backend::crossterm::EventHandler;

use crate::naming::{NamingEvent, NamingWizardState};
use crate::wizard::{WizardCtx, WizardEvent, WizardState};
use crate::wizard_draft::{
    clear_wizard_draft, from_draft, load_wizard_draft, save_wizard_draft, to_draft,
};

/// Command names for Tab autocomplete.
const KNOWN_COMMANDS: &[&str] = &["name", "new", "query", "resolve", "describe", "validate"];

/// Max palette history entries persisted to disk.
const HISTORY_CAP: usize = 200;

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
        Self { text: text.into(), kind: StatusKind::Info }
    }
    pub fn error(text: impl Into<String>) -> Self {
        Self { text: text.into(), kind: StatusKind::Error }
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
    fn from_record(t: &TokenRecord) -> Self {
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
        let file = t.file.file_name().map(|f| f.to_string_lossy().into_owned()).unwrap_or_default();
        Self { name: display_name(t), value, file, layer: layer_str(t.layer).to_string() }
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
        Self { expr_text, rows, table_state }
    }

    fn selected_row(&self) -> Option<&QueryRow> {
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

/// State for a resolve results view (winner + ranked candidates).
pub struct ResolveView {
    pub property: String,
    pub rows: Vec<ResolvedRow>,
    pub table_state: TableState,
}

impl ResolveView {
    fn new(property: String, rows: Vec<ResolvedRow>) -> Self {
        let mut table_state = TableState::default();
        if !rows.is_empty() {
            table_state.select(Some(0));
        }
        Self { property, rows, table_state }
    }

    fn selected_row(&self) -> Option<&ResolvedRow> {
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
    fn new(rows: Vec<DiagnosticRow>) -> Self {
        let mut table_state = TableState::default();
        if !rows.is_empty() {
            table_state.select(Some(0));
        }
        Self { rows, table_state }
    }

    fn selected_row(&self) -> Option<&DiagnosticRow> {
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
    Wizard(Box<WizardState>),
    Naming(Box<NamingWizardState>),
    Help(HelpModal),
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
            dataset_path: None,
            components_dir: None,
            schema_registry: None,
            mode_sets_dir: None,
        }
    }
}

// ── App ───────────────────────────────────────────────────────────────────────

/// Top-level application state.
pub struct App {
    /// Whether the palette is currently open.
    pub palette_open: bool,
    /// The mode the palette was opened in.
    pub palette_mode: PaletteMode,
    /// The text buffer for the palette prompt.
    pub palette_input: Input,
    /// Set to true when the application should exit.
    pub quit: bool,
    /// The currently active view.
    pub active_view: ActiveView,
    /// One-line status message shown above the palette; `None` when hidden.
    pub status_message: Option<StatusMessage>,
    /// Non-None while a yank is pending clipboard write; cleared by main.rs.
    pub pending_yank: Option<String>,
    /// Overlay modal; when present, all key events are routed here by main.rs.
    pub modal: Option<Modal>,

    // ── History (palette command recall) ─────────────────────────────────────
    /// Previously submitted palette commands, newest first.
    pub palette_history: Vec<String>,
    /// Index into `palette_history` being navigated; `None` = fresh input.
    pub palette_history_cursor: Option<usize>,

    // ── Mouse / selection ────────────────────────────────────────────────────
    /// Hit regions from the most recent frame, used to handle click events.
    pub hit_regions: Vec<HitRegion>,
    /// When true, mouse drags record a selection instead of scrolling.
    pub selection_mode: bool,
    /// Drag start position (row, col) in selection mode.
    pub sel_start: Option<(u16, u16)>,
    /// Drag current/end position (row, col) in selection mode.
    pub sel_end: Option<(u16, u16)>,
}

impl App {
    pub fn new() -> Self {
        Self::new_with_options(true)
    }

    /// Create the app, optionally restoring an in-progress wizard draft from disk.
    ///
    /// Pass `resume_wizard: false` for demo/recording sessions where you want a
    /// clean slate regardless of what is saved on disk (corresponds to `--no-resume-wizard`).
    pub fn new_with_options(resume_wizard: bool) -> Self {
        let modal = if resume_wizard {
            load_wizard_draft().map(|d| Modal::Wizard(Box::new(from_draft(d))))
        } else {
            None
        };
        Self {
            palette_open: false,
            palette_mode: PaletteMode::Command,
            palette_input: Input::default(),
            quit: false,
            active_view: ActiveView::Empty,
            status_message: None,
            pending_yank: None,
            modal,
            palette_history: load_palette_history(),
            palette_history_cursor: None,
            hit_regions: Vec::new(),
            selection_mode: false,
            sel_start: None,
            sel_end: None,
        }
    }

    // ── Key handling ─────────────────────────────────────────────────────────

    /// Process a key event and update state accordingly.
    pub fn handle_key(&mut self, key: KeyEvent) {
        // Ctrl-C always exits.
        if key.modifiers.contains(KeyModifiers::CONTROL) && key.code == KeyCode::Char('c') {
            self.quit = true;
            return;
        }

        if self.palette_open {
            match key.code {
                KeyCode::Esc => {
                    self.palette_open = false;
                    self.palette_input = Input::default();
                    self.palette_history_cursor = None;
                }
                KeyCode::Enter => {
                    self.palette_open = false;
                }
                KeyCode::Tab => {
                    if self.palette_mode == PaletteMode::Command {
                        let current = self.palette_input.value().to_string();
                        if !current.contains(' ') {
                            let matches: Vec<&str> = KNOWN_COMMANDS
                                .iter()
                                .copied()
                                .filter(|&c| c.starts_with(current.as_str()))
                                .collect();
                            match matches.len() {
                                0 => {}
                                1 => {
                                    self.palette_input = Input::from(format!("{} ", matches[0]));
                                }
                                _ => {
                                    self.status_message = Some(StatusMessage::info(
                                        format!("matches: {}", matches.join(" | ")),
                                    ));
                                }
                            }
                        }
                    }
                }
                // History recall (↑ = older, ↓ = newer).
                KeyCode::Up if self.palette_mode == PaletteMode::Command => {
                    let next = match self.palette_history_cursor {
                        None if !self.palette_history.is_empty() => Some(0),
                        Some(i) if i + 1 < self.palette_history.len() => Some(i + 1),
                        other => other,
                    };
                    self.palette_history_cursor = next;
                    if let Some(i) = next {
                        if let Some(entry) = self.palette_history.get(i) {
                            self.palette_input = Input::from(entry.clone());
                        }
                    }
                }
                KeyCode::Down if self.palette_mode == PaletteMode::Command => {
                    let next = self.palette_history_cursor.and_then(|i| {
                        if i == 0 { None } else { Some(i - 1) }
                    });
                    self.palette_history_cursor = next;
                    match next {
                        Some(i) => {
                            if let Some(entry) = self.palette_history.get(i) {
                                self.palette_input = Input::from(entry.clone());
                            }
                        }
                        None => {
                            self.palette_input = Input::default();
                        }
                    }
                }
                _ => {
                    // Any character input resets the history position so the next ↑ starts
                    // from the head again (mirrors bash/zsh behavior).
                    self.palette_history_cursor = None;
                    self.palette_input.handle_event(&crossterm::event::Event::Key(key));
                }
            }
            return;
        }

        let consumed = self.handle_view_key(key.code);

        if !consumed {
            match key.code {
                // Help overlay.
                KeyCode::Char('?') if self.modal.is_none() => {
                    self.modal = Some(Modal::Help(HelpModal { scroll: 0 }));
                }
                // Text selection mode toggle.
                KeyCode::Char('v') if self.modal.is_none() => {
                    self.selection_mode = !self.selection_mode;
                    if !self.selection_mode {
                        self.sel_start = None;
                        self.sel_end = None;
                    }
                    let label = if self.selection_mode { "on" } else { "off" };
                    self.status_message = Some(StatusMessage::info(
                        format!("selection mode {label}  (drag to select, release to copy)"),
                    ));
                }
                KeyCode::Char(':') => {
                    self.palette_open = true;
                    self.palette_mode = PaletteMode::Command;
                    self.palette_input = Input::default();
                    self.palette_history_cursor = None;
                }
                KeyCode::Char('/') => {
                    self.palette_open = true;
                    self.palette_mode = PaletteMode::FuzzyFind;
                    self.palette_input = Input::default();
                    self.palette_history_cursor = None;
                }
                KeyCode::Char('q') => {
                    self.quit = true;
                }
                _ => {}
            }
        }
    }

    /// Route a key event into the active modal, closing it on Cancel or Submit.
    ///
    /// Called by `main.rs` instead of `handle_key` when `app.modal.is_some()`.
    pub fn handle_modal_key(&mut self, key: KeyEvent, ctx: &WizardCtx<'_>) {
        if key.modifiers.contains(KeyModifiers::CONTROL) && key.code == KeyCode::Char('c') {
            self.quit = true;
            return;
        }

        // Help modal: closed by Esc or ?.
        if let Some(Modal::Help(ref mut hm)) = self.modal {
            match key.code {
                KeyCode::Esc | KeyCode::Char('?') => {
                    self.modal = None;
                }
                KeyCode::Up | KeyCode::Char('k') => {
                    hm.scroll = hm.scroll.saturating_sub(1);
                }
                KeyCode::Down | KeyCode::Char('j') => {
                    hm.scroll = hm.scroll.saturating_add(1);
                }
                KeyCode::PageUp => {
                    hm.scroll = hm.scroll.saturating_sub(10);
                }
                KeyCode::PageDown => {
                    hm.scroll = hm.scroll.saturating_add(10);
                }
                _ => {}
            }
            return;
        }

        // Naming modal — handled independently; no WizardCtx needed.
        if let Some(Modal::Naming(ref mut ns)) = self.modal {
            let event = ns.handle_key(key, ctx.graph);
            match event {
                NamingEvent::Cancel => {
                    self.modal = None;
                    self.status_message = Some(StatusMessage::info("naming wizard cancelled"));
                }
                NamingEvent::Copy(name) => {
                    self.pending_yank = Some(name.clone());
                    self.status_message =
                        Some(StatusMessage::info(format!("copied: {name}")));
                }
                NamingEvent::Continue => {}
            }
            return;
        }

        let event = match &mut self.modal {
            Some(Modal::Wizard(ws)) => ws.handle_key(key, ctx),
            _ => return,
        };
        match event {
            WizardEvent::Cancel => {
                self.modal = None;
                clear_wizard_draft();
                self.status_message = Some(StatusMessage::info("wizard cancelled"));
            }
            WizardEvent::Submit => {
                if !ctx.allow_write {
                    self.modal = None;
                    clear_wizard_draft();
                    self.status_message = Some(StatusMessage::info(
                        "wizard preview ready — pass --allow-write to enable writes",
                    ));
                } else {
                    let (assembled_name, write_result) =
                        if let Some(Modal::Wizard(ref ws)) = self.modal {
                            (ws.assembled_name(), Some(ws.perform_write(ctx)))
                        } else {
                            (String::new(), None)
                        };
                    match write_result {
                        Some(Ok(written_path)) => {
                            self.modal = None;
                            clear_wizard_draft();
                            self.status_message = Some(StatusMessage::info(format!(
                                "wrote {assembled_name} → {written_path}"
                            )));
                        }
                        Some(Err(e)) => {
                            if let Some(Modal::Wizard(ws)) = &mut self.modal {
                                ws.error = Some(e);
                            }
                            // Draft stays on disk; the next keystroke will re-save via
                            // persist_wizard, keeping the last good state.
                        }
                        None => {}
                    }
                }
            }
            WizardEvent::Continue => {
                self.persist_wizard();
            }
        }
    }

    /// Snapshot the current wizard modal to disk if one is open.
    fn persist_wizard(&self) {
        if let Some(Modal::Wizard(ref ws)) = self.modal {
            save_wizard_draft(&to_draft(ws));
        }
    }

    // ── Mouse handling ────────────────────────────────────────────────────────

    /// Process a mouse event and return any text that should be yanked to clipboard.
    pub fn handle_mouse(&mut self, event: MouseEvent) -> Option<String> {
        match event.kind {
            MouseEventKind::ScrollUp => {
                self.scroll_active(-1);
            }
            MouseEventKind::ScrollDown => {
                self.scroll_active(1);
            }
            MouseEventKind::Down(MouseButton::Left) => {
                if self.selection_mode {
                    self.sel_start = Some((event.row, event.column));
                    self.sel_end = Some((event.row, event.column));
                } else {
                    self.click_at(event.row, event.column);
                }
            }
            MouseEventKind::Drag(MouseButton::Left) if self.selection_mode => {
                self.sel_end = Some((event.row, event.column));
            }
            MouseEventKind::Up(MouseButton::Left) if self.selection_mode => {
                let text = self.extract_selection();
                self.sel_start = None;
                self.sel_end = None;
                if let Some(ref t) = text {
                    if !t.is_empty() {
                        self.pending_yank = Some(t.clone());
                    }
                }
                return text;
            }
            _ => {}
        }
        None
    }

    /// Scroll the active scrollable region by `delta` rows (+1 = down, -1 = up).
    fn scroll_active(&mut self, delta: i32) {
        // Naming modal has no scrollable content.
        if matches!(self.modal, Some(Modal::Naming(_))) {
            return;
        }
        // Wizard diff scroll has priority when a modal is open.
        if let Some(Modal::Wizard(ref mut ws)) = self.modal {
            if delta > 0 {
                ws.diff_scroll = ws.diff_scroll.saturating_add(delta as u16);
            } else {
                ws.diff_scroll = ws.diff_scroll.saturating_sub((-delta) as u16);
            }
            return;
        }
        // Help modal scroll.
        if let Some(Modal::Help(ref mut hm)) = self.modal {
            if delta > 0 {
                hm.scroll = hm.scroll.saturating_add(delta as u16);
            } else {
                hm.scroll = hm.scroll.saturating_sub((-delta) as u16);
            }
            return;
        }
        match &mut self.active_view {
            ActiveView::Describe(dv) => {
                let amount = delta.unsigned_abs() as u16 * 3;
                if delta > 0 {
                    dv.scroll = dv.scroll.saturating_add(amount);
                } else {
                    dv.scroll = dv.scroll.saturating_sub(amount);
                }
            }
            ActiveView::Query(qv) => {
                move_table_selection(&mut qv.table_state, qv.rows.len(), delta as i64);
            }
            ActiveView::Resolve(rv) => {
                move_table_selection(&mut rv.table_state, rv.rows.len(), delta as i64);
            }
            ActiveView::Validate(vv) => {
                move_table_selection(&mut vv.table_state, vv.rows.len(), delta as i64);
            }
            ActiveView::Empty => {}
        }
    }

    /// Click at a terminal (row, col) position and dispatch the matching hit action.
    fn click_at(&mut self, row: u16, col: u16) {
        // Collect matching actions first to avoid borrow issues.
        let action = self.hit_regions.iter().find_map(|r| {
            if rect_contains(r.rect, row, col) { Some(&r.action) } else { None }
        });
        match action {
            Some(HitAction::SelectListRow(i)) => {
                let i = *i;
                match &mut self.active_view {
                    ActiveView::Query(qv) => {
                        qv.table_state.select(Some(i));
                    }
                    ActiveView::Resolve(rv) => {
                        rv.table_state.select(Some(i));
                    }
                    ActiveView::Validate(vv) => {
                        vv.table_state.select(Some(i));
                    }
                    _ => {}
                }
            }
            None => {}
        }
    }

    /// Materialise the text covered by the current drag selection.
    fn extract_selection(&self) -> Option<String> {
        let (Some((r1, c1)), Some((r2, c2))) = (self.sel_start, self.sel_end) else {
            return None;
        };
        let min_row = r1.min(r2);
        let max_row = r1.max(r2);
        let min_col = c1.min(c2);
        let max_col = c1.max(c2);
        let mut lines: Vec<&str> = Vec::new();
        for region in &self.hit_regions {
            let r_y = region.rect.y;
            let r_x = region.rect.x;
            let r_x_end = r_x + region.rect.width;
            if r_y >= min_row && r_y <= max_row && r_x_end > min_col && r_x <= max_col {
                lines.push(&region.text);
            }
        }
        if lines.is_empty() { None } else { Some(lines.join("\n")) }
    }

    // ── View key routing ─────────────────────────────────────────────────────

    /// Handle view-specific keys, returning `true` when the key was consumed.
    fn handle_view_key(&mut self, code: KeyCode) -> bool {
        match code {
            KeyCode::Esc => {
                if matches!(self.active_view, ActiveView::Empty) {
                    return false;
                }
                self.active_view = ActiveView::Empty;
                self.status_message = None;
                true
            }
            KeyCode::Up | KeyCode::Char('k') => match &mut self.active_view {
                ActiveView::Query(qv) => {
                    move_table_selection(&mut qv.table_state, qv.rows.len(), -1);
                    true
                }
                ActiveView::Resolve(rv) => {
                    move_table_selection(&mut rv.table_state, rv.rows.len(), -1);
                    true
                }
                ActiveView::Validate(vv) => {
                    move_table_selection(&mut vv.table_state, vv.rows.len(), -1);
                    true
                }
                ActiveView::Describe(dv) => {
                    dv.scroll = dv.scroll.saturating_sub(1);
                    true
                }
                ActiveView::Empty => false,
            },
            KeyCode::Down | KeyCode::Char('j') => match &mut self.active_view {
                ActiveView::Query(qv) => {
                    move_table_selection(&mut qv.table_state, qv.rows.len(), 1);
                    true
                }
                ActiveView::Resolve(rv) => {
                    move_table_selection(&mut rv.table_state, rv.rows.len(), 1);
                    true
                }
                ActiveView::Validate(vv) => {
                    move_table_selection(&mut vv.table_state, vv.rows.len(), 1);
                    true
                }
                ActiveView::Describe(dv) => {
                    dv.scroll = dv.scroll.saturating_add(1);
                    true
                }
                ActiveView::Empty => false,
            },
            KeyCode::PageUp => {
                if let ActiveView::Describe(ref mut dv) = self.active_view {
                    dv.scroll = dv.scroll.saturating_sub(10);
                    true
                } else {
                    false
                }
            }
            KeyCode::PageDown => {
                if let ActiveView::Describe(ref mut dv) = self.active_view {
                    dv.scroll = dv.scroll.saturating_add(10);
                    true
                } else {
                    false
                }
            }
            KeyCode::Char('y') => {
                let yank = match &self.active_view {
                    ActiveView::Query(qv) => qv.selected_row().map(|r| r.name.clone()),
                    ActiveView::Resolve(rv) => rv.selected_row().map(|r| r.name.clone()),
                    ActiveView::Validate(vv) => vv.selected_row().map(|r| r.message.clone()),
                    ActiveView::Describe(_) | ActiveView::Empty => None,
                };
                if let Some(text) = yank {
                    self.pending_yank = Some(text);
                    true
                } else {
                    false
                }
            }
            _ => false,
        }
    }

    // ── Palette dispatch ─────────────────────────────────────────────────────

    /// Dispatch a committed palette command against the graph and optional context paths.
    pub fn submit_palette(&mut self, ctx: &SubmitContext<'_>) {
        if self.palette_mode != PaletteMode::Command {
            self.palette_open = false;
            self.palette_input = Input::default();
            return;
        }

        let raw = self.palette_input.value().trim().to_string();
        self.palette_open = false;
        self.palette_input = Input::default();
        self.palette_history_cursor = None;

        // Append to history (dedupe head, cap at HISTORY_CAP).
        if !raw.is_empty()
            && self.palette_history.first().map(|s| s.as_str()) != Some(raw.as_str())
        {
            self.palette_history.insert(0, raw.clone());
            self.palette_history.truncate(HISTORY_CAP);
            save_palette_history(&self.palette_history);
        }

        let (cmd, rest) = match raw.split_once(' ') {
            Some((c, r)) => (c.to_lowercase(), r.trim().to_string()),
            None => (raw.to_lowercase(), String::new()),
        };

        match cmd.as_str() {
            "query" => {
                if rest.is_empty() {
                    self.status_message = Some(StatusMessage::error("query: expression required"));
                    return;
                }
                match query::parse(&rest) {
                    Ok(expr) => {
                        let records = query::filter(ctx.graph, &expr);
                        let rows: Vec<QueryRow> =
                            records.iter().map(|r| QueryRow::from_record(r)).collect();
                        let count = rows.len();
                        self.active_view = ActiveView::Query(QueryView::new(rest.clone(), rows));
                        self.status_message =
                            Some(StatusMessage::info(format!("{count} token(s) matched")));
                    }
                    Err(e) => {
                        self.status_message =
                            Some(StatusMessage::error(format!("query error: {e}")));
                    }
                }
            }
            "resolve" => {
                if rest.is_empty() {
                    self.status_message =
                        Some(StatusMessage::error("resolve: property=<name> required"));
                    return;
                }
                let (prop, res_ctx) = match parse_resolve_args(&rest) {
                    Ok(v) => v,
                    Err(e) => {
                        self.status_message =
                            Some(StatusMessage::error(format!("resolve: {e}")));
                        return;
                    }
                };
                let candidates: Vec<TokenRecord> = ctx
                    .graph
                    .tokens
                    .values()
                    .filter(|t| {
                        t.raw
                            .get("name")
                            .and_then(|v| v.as_object())
                            .and_then(|n| n.get("property"))
                            .and_then(|v| v.as_str())
                            == Some(prop.as_str())
                    })
                    .cloned()
                    .collect();
                if candidates.is_empty() {
                    self.active_view = ActiveView::Resolve(ResolveView::new(prop, vec![]));
                    self.status_message = Some(StatusMessage::info("no match"));
                    return;
                }
                let filtered_graph = TokenGraph::from_records(candidates)
                    .with_mode_sets(ctx.graph.mode_sets.clone());
                let mut with_spec: Vec<(&TokenRecord, u32)> = filtered_graph
                    .tokens
                    .values()
                    .map(|t| {
                        let s = t
                            .raw
                            .get("name")
                            .and_then(|v| v.as_object())
                            .map(|n| specificity(n, &filtered_graph.mode_sets))
                            .unwrap_or(0);
                        (t, s)
                    })
                    .collect();
                with_spec.sort_by(|(a, sa), (b, sb)| {
                    b.layer
                        .cmp(&a.layer)
                        .then_with(|| sb.cmp(sa))
                        .then_with(|| a.file.cmp(&b.file))
                        .then_with(|| a.index.cmp(&b.index))
                });
                let winner = cascade::resolve(&filtered_graph, &res_ctx);
                let rows: Vec<ResolvedRow> = with_spec
                    .iter()
                    .map(|(t, spec)| {
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
                        let is_winner = winner.map(|w| w.name == t.name).unwrap_or(false);
                        ResolvedRow {
                            name: display_name(t),
                            value,
                            file,
                            layer: layer_str(t.layer).to_string(),
                            specificity: *spec,
                            is_winner,
                        }
                    })
                    .collect();
                let count = rows.len();
                self.active_view = ActiveView::Resolve(ResolveView::new(prop, rows));
                self.status_message =
                    Some(StatusMessage::info(format!("{count} candidate(s)")));
            }
            "describe" | "component" => {
                if rest.is_empty() {
                    self.status_message =
                        Some(StatusMessage::error("describe: component ID required"));
                    return;
                }
                let id = rest.trim();
                if id.is_empty()
                    || !id.chars().next().is_some_and(|c| c.is_ascii_lowercase())
                    || !id
                        .chars()
                        .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
                {
                    self.status_message =
                        Some(StatusMessage::error(format!("invalid component ID '{id}'")));
                    return;
                }
                let Some(comp_dir) = ctx.components_dir else {
                    self.status_message = Some(StatusMessage::error(
                        "describe: no components directory available",
                    ));
                    return;
                };
                let file_path = comp_dir.join(format!("{id}.json"));
                if file_path.is_file() {
                    match std::fs::read_to_string(&file_path) {
                        Ok(raw_text) => match serde_json::from_str::<serde_json::Value>(&raw_text)
                        {
                            Ok(doc) => match serde_json::to_string_pretty(&doc) {
                                Ok(pretty) => {
                                    self.active_view = ActiveView::Describe(DescribeView {
                                        component: id.to_string(),
                                        pretty_json: pretty,
                                        scroll: 0,
                                    });
                                    self.status_message = None;
                                }
                                Err(e) => {
                                    self.status_message = Some(StatusMessage::error(format!(
                                        "describe: render error: {e}"
                                    )));
                                }
                            },
                            Err(e) => {
                                self.status_message = Some(StatusMessage::error(format!(
                                    "describe: parse error: {e}"
                                )));
                            }
                        },
                        Err(e) => {
                            self.status_message = Some(StatusMessage::error(format!(
                                "describe: read error: {e}"
                            )));
                        }
                    }
                } else {
                    let available: Vec<&str> =
                        ctx.graph.components.iter().map(|c| c.name.as_str()).collect();
                    let suggestion = if available.is_empty() {
                        String::new()
                    } else {
                        let prefix_len = id.len().min(3);
                        let prefix = &id[..prefix_len];
                        let mut matches: Vec<&str> = available
                            .iter()
                            .filter(|&&n| n.starts_with(id))
                            .copied()
                            .collect();
                        if matches.is_empty() {
                            matches = available
                                .iter()
                                .filter(|&&n| n.starts_with(prefix))
                                .copied()
                                .collect();
                        }
                        if !matches.is_empty() {
                            format!(
                                " — did you mean: {}",
                                matches[..matches.len().min(3)].join(", ")
                            )
                        } else {
                            String::new()
                        }
                    };
                    self.status_message = Some(StatusMessage::error(format!(
                        "unknown component: {id}{suggestion}"
                    )));
                }
            }
            "validate" => {
                let (Some(dataset_path), Some(registry)) =
                    (ctx.dataset_path, ctx.schema_registry)
                else {
                    self.status_message = Some(StatusMessage::error(
                        "validate: dataset or schema registry unavailable",
                    ));
                    return;
                };
                match validate::validate_all_with_options_and_names(
                    dataset_path,
                    registry,
                    &HashSet::new(),
                    ctx.mode_sets_dir,
                    ctx.components_dir,
                    None,
                ) {
                    Ok(report) => {
                        let rows: Vec<DiagnosticRow> = report
                            .errors
                            .iter()
                            .map(|d| DiagnosticRow {
                                severity: "error".to_string(),
                                rule_id: d.rule_id.clone().unwrap_or_default(),
                                token: d.token.clone().unwrap_or_default(),
                                message: d.message.clone(),
                            })
                            .chain(report.warnings.iter().map(|d| DiagnosticRow {
                                severity: "warning".to_string(),
                                rule_id: d.rule_id.clone().unwrap_or_default(),
                                token: d.token.clone().unwrap_or_default(),
                                message: d.message.clone(),
                            }))
                            .collect();
                        let count = rows.len();
                        self.active_view = ActiveView::Validate(ValidateView::new(rows));
                        self.status_message =
                            Some(StatusMessage::info(format!("{count} finding(s)")));
                    }
                    Err(e) => {
                        self.status_message =
                            Some(StatusMessage::error(format!("validate: {e}")));
                    }
                }
            }
            "name" => {
                let mut ns = NamingWizardState::new_with_intent(rest.trim());
                ns.refresh_suggestions(ctx.graph);
                self.modal = Some(Modal::Naming(Box::new(ns)));
                self.status_message = None;
            }
            "new" | "create" => {
                let mut ws = WizardState::new_with_intent(rest.trim());
                ws.refresh_suggestions(ctx.graph);
                self.modal = Some(Modal::Wizard(Box::new(ws)));
                self.status_message = None;
            }
            other => {
                self.status_message =
                    Some(StatusMessage::error(format!("unknown command: {other}")));
            }
        }
    }

    // ── Misc helpers ─────────────────────────────────────────────────────────

    /// Take the pending yank string, clearing it from app state.
    pub fn take_pending_yank(&mut self) -> Option<String> {
        self.pending_yank.take()
    }

    /// The prompt prefix to display when the palette is open.
    pub fn palette_prefix(&self) -> &'static str {
        match self.palette_mode {
            PaletteMode::Command => ":",
            PaletteMode::FuzzyFind => "/",
        }
    }
}

impl Default for App {
    fn default() -> Self {
        Self::new()
    }
}

// ── History persistence ───────────────────────────────────────────────────────

/// Resolve the path for the persistent palette history file.
///
/// Reads `DESIGN_DATA_TUI_HISTORY` env var first (used in tests), then falls
/// back to `dirs::data_dir()/design-data-tui/history`.
pub fn history_path() -> Option<PathBuf> {
    if let Ok(p) = std::env::var("DESIGN_DATA_TUI_HISTORY") {
        return Some(PathBuf::from(p));
    }
    dirs::data_dir().map(|d| d.join("design-data-tui").join("history"))
}

fn load_palette_history() -> Vec<String> {
    let Some(path) = history_path() else { return Vec::new() };
    std::fs::read_to_string(&path)
        .map(|s| {
            s.lines()
                .filter(|l| !l.is_empty())
                .map(|l| l.to_string())
                .collect()
        })
        .unwrap_or_default()
}

fn save_palette_history(history: &[String]) {
    let Some(path) = history_path() else { return };
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let content = history.join("\n");
    let tmp = path.with_extension("tmp");
    if std::fs::write(&tmp, &content).is_ok() {
        let _ = std::fs::rename(&tmp, &path);
    }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

fn layer_str(layer: Layer) -> &'static str {
    match layer {
        Layer::Foundation => "foundation",
        Layer::Platform => "platform",
        Layer::Product => "product",
    }
}

/// Advance a `TableState` selection by `delta` rows, clamping at the bounds.
pub fn move_table_selection(state: &mut TableState, len: usize, delta: i64) {
    if len == 0 {
        return;
    }
    let current = state.selected().unwrap_or(0) as i64;
    let next = (current + delta).clamp(0, len as i64 - 1) as usize;
    state.select(Some(next));
}

/// Test whether `(row, col)` is inside `rect`.
fn rect_contains(rect: Rect, row: u16, col: u16) -> bool {
    col >= rect.x
        && col < rect.x + rect.width
        && row >= rect.y
        && row < rect.y + rect.height
}

/// Parse the rest-string for `:resolve` into a property name + `ResolutionContext`.
fn parse_resolve_args(rest: &str) -> Result<(String, ResolutionContext), String> {
    let mut property: Option<String> = None;
    let mut ctx = ResolutionContext::new();
    for pair in rest.split(',') {
        let pair = pair.trim();
        if let Some((k, v)) = pair.split_once('=') {
            let k = k.trim();
            let v = v.trim();
            if k == "property" {
                property = Some(v.to_string());
            } else if !k.is_empty() && !v.is_empty() {
                ctx = ctx.with(k, v);
            }
        }
    }
    let prop = property.ok_or_else(|| "missing property= in expression".to_string())?;
    if prop.is_empty() {
        return Err("property value must not be empty".to_string());
    }
    Ok((prop, ctx))
}
