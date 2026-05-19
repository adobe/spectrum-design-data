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
use std::path::Path;

use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};
use design_data_core::cascade::{self, ResolutionContext, specificity};
use design_data_core::diff::display_name;
use design_data_core::graph::{Layer, TokenGraph, TokenRecord};
use design_data_core::query;
use design_data_core::schema::SchemaRegistry;
use design_data_core::validate;
use ratatui::widgets::TableState;
use tui_input::Input;
use tui_input::backend::crossterm::EventHandler;

/// Command names for Tab autocomplete.
const KNOWN_COMMANDS: &[&str] = &["query", "resolve", "describe", "validate"];

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
                KeyCode::Tab => {
                    if self.palette_mode == PaletteMode::Command {
                        let current = self.palette_input.value().to_string();
                        // Only autocomplete while the user is still typing the command word.
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
                _ => {
                    self.palette_input.handle_event(&crossterm::event::Event::Key(key));
                }
            }
            return;
        }

        // View-specific keys.  Returns true when the key was consumed so the
        // shared fallback (palette open / quit) is skipped.
        let consumed = self.handle_view_key(key.code);

        if !consumed {
            match key.code {
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
            }
        }
    }

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
                // Clone the yank text before mutating pending_yank.
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

    /// Dispatch a committed palette command against the graph and optional context paths.
    ///
    /// Called by main.rs after Enter is pressed in Command mode. Fuzzy-find mode (M2+)
    /// is a no-op here.
    pub fn submit_palette(&mut self, ctx: &SubmitContext<'_>) {
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
                // Filter to tokens whose name.property matches.
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
                // Compute specificity once per token, then sort.
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
                // IDs must match ^[a-z][a-z0-9-]*$ (mirrors run_component in cli/main.rs).
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
                    // Suggest close prefix matches from the loaded component list.
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
            other => {
                self.status_message =
                    Some(StatusMessage::error(format!("unknown command: {other}")));
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

// ── Helpers ───────────────────────────────────────────────────────────────────

fn layer_str(layer: Layer) -> &'static str {
    match layer {
        Layer::Foundation => "foundation",
        Layer::Platform => "platform",
        Layer::Product => "product",
    }
}

/// Advance a `TableState` selection by `delta` rows, clamping at the bounds.
fn move_table_selection(state: &mut TableState, len: usize, delta: i64) {
    if len == 0 {
        return;
    }
    let current = state.selected().unwrap_or(0) as i64;
    let next = (current + delta).clamp(0, len as i64 - 1) as usize;
    state.select(Some(next));
}

/// Parse the rest-string for `:resolve` into a property name + `ResolutionContext`.
///
/// Syntax: `property=<name>[,<mode-set>=<mode>...]`
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
