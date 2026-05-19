// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};
use design_data_core::diff::display_name;
use design_data_core::graph::{Layer, TokenGraph, TokenRecord};
use design_data_core::query;
use ratatui::widgets::TableState;
use tui_input::Input;
use tui_input::backend::crossterm::EventHandler;

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
        let layer = match t.layer {
            Layer::Foundation => "foundation",
            Layer::Platform => "platform",
            Layer::Product => "product",
        }
        .to_string();
        Self {
            name: display_name(t),
            value,
            file,
            layer,
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
    fn new(expr_text: String, rows: Vec<QueryRow>) -> Self {
        let mut table_state = TableState::default();
        if !rows.is_empty() {
            table_state.select(Some(0));
        }
        Self { expr_text, rows, table_state }
    }

    fn selected_row(&self) -> Option<&QueryRow> {
        self.table_state.selected().and_then(|i| self.rows.get(i))
    }

    fn move_selection(&mut self, delta: i64) {
        if self.rows.is_empty() {
            return;
        }
        let len = self.rows.len() as i64;
        let current = self.table_state.selected().unwrap_or(0) as i64;
        let next = (current + delta).clamp(0, len - 1) as usize;
        self.table_state.select(Some(next));
    }
}

/// Which view the active area is showing.
pub enum ActiveView {
    Empty,
    Query(QueryView),
}

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
}

impl App {
    pub fn new() -> Self {
        Self {
            palette_open: false,
            palette_mode: PaletteMode::Command,
            palette_input: Input::default(),
            quit: false,
            active_view: ActiveView::Empty,
            status_message: None,
            pending_yank: None,
        }
    }

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
                }
                // Enter closes the palette; main.rs detects the closed state and
                // calls submit_palette with the graph.
                KeyCode::Enter => {
                    self.palette_open = false;
                }
                _ => {
                    self.palette_input.handle_event(&crossterm::event::Event::Key(key));
                }
            }
        } else {
            match &self.active_view {
                ActiveView::Query(_) => match key.code {
                    KeyCode::Up | KeyCode::Char('k') => {
                        if let ActiveView::Query(ref mut qv) = self.active_view {
                            qv.move_selection(-1);
                        }
                    }
                    KeyCode::Down | KeyCode::Char('j') => {
                        if let ActiveView::Query(ref mut qv) = self.active_view {
                            qv.move_selection(1);
                        }
                    }
                    KeyCode::Char('y') => {
                        if let ActiveView::Query(ref qv) = self.active_view {
                            if let Some(row) = qv.selected_row() {
                                self.pending_yank = Some(row.name.clone());
                            }
                        }
                    }
                    KeyCode::Esc => {
                        self.active_view = ActiveView::Empty;
                        self.status_message = None;
                    }
                    KeyCode::Char(':') => {
                        self.palette_open = true;
                        self.palette_mode = PaletteMode::Command;
                        self.palette_input = Input::default();
                    }
                    KeyCode::Char('/') => {
                        self.palette_open = true;
                        self.palette_mode = PaletteMode::FuzzyFind;
                        self.palette_input = Input::default();
                    }
                    KeyCode::Char('q') => {
                        self.quit = true;
                    }
                    _ => {}
                },
                ActiveView::Empty => match key.code {
                    KeyCode::Char(':') => {
                        self.palette_open = true;
                        self.palette_mode = PaletteMode::Command;
                        self.palette_input = Input::default();
                    }
                    KeyCode::Char('/') => {
                        self.palette_open = true;
                        self.palette_mode = PaletteMode::FuzzyFind;
                        self.palette_input = Input::default();
                    }
                    KeyCode::Char('q') => {
                        self.quit = true;
                    }
                    _ => {}
                },
            }
        }
    }

    /// Dispatch a committed palette command against the graph.
    ///
    /// Called by main.rs after Enter is pressed in Command mode, passing the
    /// loaded graph. Fuzzy-find mode (M2+) is a no-op here.
    pub fn submit_palette(&mut self, graph: &TokenGraph) {
        if self.palette_mode != PaletteMode::Command {
            self.palette_open = false;
            self.palette_input = Input::default();
            return;
        }

        let raw = self.palette_input.value().trim().to_string();
        self.palette_open = false;
        self.palette_input = Input::default();

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
                        let records = query::filter(graph, &expr);
                        let rows: Vec<QueryRow> = records.iter().map(|r| QueryRow::from_record(r)).collect();
                        let count = rows.len();
                        self.active_view = ActiveView::Query(QueryView::new(rest.clone(), rows));
                        self.status_message = Some(StatusMessage::info(format!("{count} token(s) matched")));
                    }
                    Err(e) => {
                        self.status_message = Some(StatusMessage::error(format!("query error: {e}")));
                    }
                }
            }
            other => {
                self.status_message = Some(StatusMessage::error(format!("unknown command: {other}")));
            }
        }
    }

    /// Take the pending yank string, clearing it from app state.
    ///
    /// Returns `Some(text)` when a yank is pending; `None` otherwise.
    /// main.rs calls this after writing to the clipboard.
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
