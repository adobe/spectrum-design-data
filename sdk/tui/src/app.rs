// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

use std::path::PathBuf;

use crossterm::event::{KeyCode, KeyEvent, KeyModifiers, MouseButton, MouseEvent, MouseEventKind};
use design_data_core::cascade::ResolutionContext;
use ratatui::layout::Rect;
use ratatui::widgets::TableState;
use tui_input::backend::crossterm::EventHandler;
use tui_input::Input;

use crate::find::FindEvent;
use crate::naming::NamingEvent;
use crate::wizard::{WizardCtx, WizardEvent};
use crate::wizard_draft::{clear_wizard_draft, from_draft, load_wizard_draft};

pub use crate::app_views::*;

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
                                    self.status_message = Some(StatusMessage::info(format!(
                                        "matches: {}",
                                        matches.join(" | ")
                                    )));
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
                        if i == 0 {
                            None
                        } else {
                            Some(i - 1)
                        }
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
                    self.palette_input
                        .handle_event(&crossterm::event::Event::Key(key));
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
                    self.status_message = Some(StatusMessage::info(format!(
                        "selection mode {label}  (drag to select, release to copy)"
                    )));
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

        // Find wizard modal.
        if let Some(Modal::Find(ref mut fs)) = self.modal {
            let event = fs.handle_key(key, ctx.graph, &ctx.token_index);
            match event {
                FindEvent::Cancel => {
                    self.modal = None;
                    self.status_message = Some(StatusMessage::info("find wizard cancelled"));
                }
                FindEvent::OpenResults(view) => {
                    let count = view.rows.len();
                    self.active_view = ActiveView::Query(view);
                    self.status_message =
                        Some(StatusMessage::info(format!("{count} token(s) matched")));
                    self.modal = None;
                }
                FindEvent::Continue => {}
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
                    self.status_message = Some(StatusMessage::info(format!("copied: {name}")));
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

    /// Snapshot the current modal's state to disk, if it supports persistence.
    fn persist_wizard(&self) {
        if let Some(ref modal) = self.modal {
            modal.persist();
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
        // Route into modal if it wants scroll; bail out for modals that don't scroll.
        if let Some(ref mut modal) = self.modal {
            if modal.wants_scroll() {
                modal.on_scroll(delta);
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
            if rect_contains(r.rect, row, col) {
                Some(&r.action)
            } else {
                None
            }
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
        if lines.is_empty() {
            None
        } else {
            Some(lines.join("\n"))
        }
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

    // ── Palette dispatch — see app_palette.rs ────────────────────────────────
    // `submit_palette` is defined in a separate `impl App` block in app_palette.rs.

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
    // "design-data-tui" is the stable app-data name, intentionally kept even
    // though the binary is now `design-data`, to avoid orphaning history on
    // existing installs when the binary was renamed.
    dirs::data_dir().map(|d| d.join("design-data-tui").join("history"))
}

pub(crate) fn load_palette_history() -> Vec<String> {
    let Some(path) = history_path() else {
        return Vec::new();
    };
    std::fs::read_to_string(&path)
        .map(|s| {
            s.lines()
                .filter(|l| !l.is_empty())
                .map(|l| l.to_string())
                .collect()
        })
        .unwrap_or_default()
}

pub(crate) fn save_palette_history(history: &[String]) {
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
// `layer_str` lives in app_views.rs (re-exported here via `pub use crate::app_views::*`).
// `apply_scroll_delta` lives in app_views.rs (used by Modal::on_scroll).

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
pub(crate) fn rect_contains(rect: Rect, row: u16, col: u16) -> bool {
    col >= rect.x && col < rect.x + rect.width && row >= rect.y && row < rect.y + rect.height
}

pub(crate) fn parse_resolve_args(rest: &str) -> Result<(String, ResolutionContext), String> {
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

/// Layer platform manifest mode-set restrictions onto a parsed resolve context.
pub(crate) fn resolve_context_with_restrictions(
    ctx: ResolutionContext,
    restrictions: &std::collections::HashMap<String, Vec<String>>,
) -> ResolutionContext {
    restrictions.iter().fold(ctx, |acc, (mode_set, allowed)| {
        acc.with_restriction(mode_set.clone(), allowed.clone())
    })
}
