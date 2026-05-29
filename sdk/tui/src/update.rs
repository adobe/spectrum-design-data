// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Pure `update` function — the single state-transition entry point (GH #1020).
//!
//! `update` takes the current `Model`, an incoming `Message`, and read-only
//! external context (`UpdateCtx`). It returns a `Task<Message>` describing any
//! side effects to run. It never calls `std::fs`, clipboard, or any async
//! runtime directly — those are wrapped in `Task::Cmd` closures.
//!
//! Side effects deferred to `#1023`: `describe` FS read, `validate` FS scan,
//! and `--allow-write` wizard writes still execute inline; they are tagged with
//! `// TODO(#1023)` comments.

use std::collections::HashSet;
use std::path::Path;

use crossterm::event::{KeyCode, KeyModifiers, MouseButton, MouseEventKind};
use tui_input::backend::crossterm::EventHandler;
use design_data_core::cascade::{self, specificity};
use design_data_core::diff::display_name;
use design_data_core::graph::{TokenGraph, TokenRecord};
use design_data_core::schema::SchemaRegistry;

use crate::clipboard::write_clipboard;
use crate::app::{
    ActiveView, DescribeView, HitAction, Modal, PaletteMode, QueryRow, QueryView, ResolvedRow,
    ResolveView, StatusMessage, ValidateView, HISTORY_CAP, KNOWN_COMMANDS,
    layer_str, move_table_selection, parse_resolve_args, rect_contains, save_palette_history,
};
use crate::find::{FindEvent, FindWizardState};
use crate::message::Message;
use crate::model::Model;
use crate::naming::{NamingEvent, NamingWizardState};
use crate::task::Task;
use crate::wizard::{WizardCtx, WizardEvent, WizardState};
use crate::wizard_draft::{clear_wizard_draft, save_wizard_draft, to_draft};
use crate::update_command::{dispatch_command, extract_selection_from_regions};

// ── External context ──────────────────────────────────────────────────────────

/// Read-only external context passed into `update` alongside the message.
///
/// Combines the fields of `SubmitContext` and `WizardCtx` so `update` is a
/// single entry point regardless of which command or modal is active.
pub struct UpdateCtx<'a> {
    pub graph: &'a TokenGraph,
    pub dataset_path: Option<&'a Path>,
    pub components_dir: Option<&'a Path>,
    pub schema_registry: Option<&'a SchemaRegistry>,
    pub mode_sets_dir: Option<&'a Path>,
    pub allow_write: bool,
}

impl<'a> UpdateCtx<'a> {
    /// Minimal context for tests that only need key/palette/modal behavior.
    pub fn minimal(graph: &'a TokenGraph) -> Self {
        Self {
            graph,
            dataset_path: None,
            components_dir: None,
            schema_registry: None,
            mode_sets_dir: None,
            allow_write: false,
        }
    }

    fn as_wizard_ctx(&self) -> WizardCtx<'_> {
        WizardCtx {
            graph: self.graph,
            dataset_path: self.dataset_path,
            schema_registry: self.schema_registry,
            allow_write: self.allow_write,
        }
    }
}

// ── Entry point ───────────────────────────────────────────────────────────────

/// The single state-transition function for the TUI runtime.
///
/// Routes `msg` through the appropriate handler based on current `model` state,
/// mutates `model` in place, and returns a `Task` describing any side effects
/// to execute outside this call (FS writes, clipboard, etc.).
pub fn update(model: &mut Model, msg: Message, ctx: &UpdateCtx<'_>) -> Task<Message> {
    match msg {
        Message::Key(key) => handle_key(model, key, ctx),
        Message::Mouse(me) => handle_mouse(model, me),
        Message::PaletteSubmit(raw) => handle_palette_submit(model, raw, ctx),
        Message::PaletteCancel => {
            model.close_palette();
            Task::none()
        }
        Message::PaletteHistoryNav { older } => {
            handle_history_nav(model, older);
            Task::none()
        }
        Message::WriteDone(result) => {
            match result {
                Ok(path) => {
                    model.status_message =
                        Some(StatusMessage::info(format!("wrote → {}", path.display())));
                }
                Err(e) => {
                    if let Some(Modal::Wizard(ref mut ws)) = model.modal_mut() {
                        ws.error = Some(e);
                    }
                }
            }
            Task::none()
        }
        // Synthetic modal messages exist in Message for replay/injection use.
        // The Key path handles them via modal delegation above; no-op here.
        Message::WizardAdvance
        | Message::WizardBack
        | Message::WizardConfirm
        | Message::WizardCancel
        | Message::NamingCopy(_)
        | Message::NamingCancel
        | Message::FindOpenResults
        | Message::FindCancel
        | Message::Tick
        | Message::ClipboardDone(None) => Task::none(),
        Message::ClipboardDone(Some(err)) => {
            model.status_message =
                Some(StatusMessage::error(format!("clipboard unavailable: {err}")));
            Task::none()
        }
    }
}

// ── Key handling ──────────────────────────────────────────────────────────────

fn handle_key(
    model: &mut Model,
    key: crossterm::event::KeyEvent,
    ctx: &UpdateCtx<'_>,
) -> Task<Message> {
    // Ctrl-C always exits.
    if key.modifiers.contains(KeyModifiers::CONTROL) && key.code == KeyCode::Char('c') {
        model.quit = true;
        return Task::none();
    }

    // While the palette is open all keys are consumed here.
    if model.is_palette_open() {
        return handle_palette_key(model, key);
    }

    // Modal captures all key input when present.
    if model.is_modal_open() {
        return route_modal_key(model, key, ctx);
    }

    // View-specific keys (navigation, yank).
    if handle_view_key(model, key.code) {
        // 'y' key sets model.pending_yank; drain it here and return a clipboard Task.
        return clipboard_task_from_yank(model);
    }

    // Global fallback keys.
    match key.code {
        KeyCode::Char('?') => {
            model.open_modal(Modal::Help(crate::app::HelpModal { scroll: 0 }));
        }
        KeyCode::Char('v') => {
            let was_selecting = model.is_selecting();
            model.toggle_selection_mode();
            let label = if !was_selecting { "on" } else { "off" };
            model.status_message = Some(StatusMessage::info(
                format!("selection mode {label}  (drag to select, release to copy)"),
            ));
        }
        KeyCode::Char(':') => {
            model.open_command_palette();
        }
        KeyCode::Char('/') => {
            model.open_fuzzy_palette();
        }
        KeyCode::Char('q') => {
            model.quit = true;
        }
        _ => {}
    }
    Task::none()
}

fn handle_palette_key(
    model: &mut Model,
    key: crossterm::event::KeyEvent,
) -> Task<Message> {
    let palette_cmd_mode = model.palette_mode() == Some(PaletteMode::Command);

    match key.code {
        KeyCode::Esc => {
            model.close_palette();
        }
        KeyCode::Enter => {
            // Close the palette. The runtime sends a separate Message::PaletteSubmit
            // after detecting this transition; submit is NOT dispatched here.
            model.close_palette();
        }
        KeyCode::Tab if palette_cmd_mode => {
            let current = model.palette_input_value().to_string();
            if !current.contains(' ') {
                let matches: Vec<&str> = KNOWN_COMMANDS
                    .iter()
                    .copied()
                    .filter(|&c| c.starts_with(current.as_str()))
                    .collect();
                match matches.len() {
                    0 => {}
                    1 => {
                        let new_input = tui_input::Input::from(format!("{} ", matches[0]));
                        if let Some(ps) = model.palette_state_mut() {
                            ps.input = new_input;
                        }
                    }
                    _ => {
                        model.status_message = Some(StatusMessage::info(
                            format!("matches: {}", matches.join(" | ")),
                        ));
                    }
                }
            }
        }
        KeyCode::Up if palette_cmd_mode => {
            handle_history_nav(model, true);
        }
        KeyCode::Down if palette_cmd_mode => {
            handle_history_nav(model, false);
        }
        _ => {
            if let Some(ps) = model.palette_state_mut() {
                ps.history_cursor = None;
                ps.input.handle_event(&crossterm::event::Event::Key(key));
            }
        }
    }
    Task::none()
}

fn handle_history_nav(model: &mut Model, older: bool) {
    // Called only when palette is open (from handle_palette_key).
    // Two-pass: read first (no borrow conflict), then write.
    let current_cursor = model.palette_history_cursor();
    let history_len = model.palette_history.len();

    let next = if older {
        match current_cursor {
            None if history_len > 0 => Some(0),
            Some(i) if i + 1 < history_len => Some(i + 1),
            other => other,
        }
    } else {
        current_cursor.and_then(|i| if i == 0 { None } else { Some(i - 1) })
    };

    let entry = next.and_then(|i| model.palette_history.get(i)).cloned();

    if let Some(ps) = model.palette_state_mut() {
        ps.history_cursor = next;
        ps.input = match entry {
            Some(text) => tui_input::Input::from(text),
            None => tui_input::Input::default(),
        };
    }
}

/// Handle a view-specific key. Returns `true` when the key was consumed.
fn handle_view_key(model: &mut Model, code: KeyCode) -> bool {
    match code {
        KeyCode::Esc => {
            if matches!(model.active_view, ActiveView::Empty) {
                return false;
            }
            model.active_view = ActiveView::Empty;
            model.status_message = None;
            true
        }
        KeyCode::Up | KeyCode::Char('k') => match &mut model.active_view {
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
        KeyCode::Down | KeyCode::Char('j') => match &mut model.active_view {
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
            if let ActiveView::Describe(ref mut dv) = model.active_view {
                dv.scroll = dv.scroll.saturating_sub(10);
                true
            } else {
                false
            }
        }
        KeyCode::PageDown => {
            if let ActiveView::Describe(ref mut dv) = model.active_view {
                dv.scroll = dv.scroll.saturating_add(10);
                true
            } else {
                false
            }
        }
        KeyCode::Char('y') => {
            let yank = match &model.active_view {
                ActiveView::Query(qv) => qv.selected_row().map(|r| r.name.clone()),
                ActiveView::Resolve(rv) => rv.selected_row().map(|r| r.name.clone()),
                ActiveView::Validate(vv) => vv.selected_row().map(|r| r.message.clone()),
                ActiveView::Describe(_) | ActiveView::Empty => None,
            };
            if let Some(text) = yank {
                // Stash in pending_yank; handle_key drains it after this returns and
                // builds a Task::Cmd(write_clipboard) so the clipboard I/O is a side effect.
                model.pending_yank = Some(text);
                true
            } else {
                false
            }
        }
        _ => false,
    }
}

// ── Modal key routing ─────────────────────────────────────────────────────────

fn route_modal_key(
    model: &mut Model,
    key: crossterm::event::KeyEvent,
    ctx: &UpdateCtx<'_>,
) -> Task<Message> {
    // Help modal.
    if let Some(Modal::Help(ref mut hm)) = model.modal_mut() {
        match key.code {
            KeyCode::Esc | KeyCode::Char('?') => {
                model.close_modal();
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
        return Task::none();
    }

    // Find modal.
    if let Some(Modal::Find(ref mut fs)) = model.modal_mut() {
        let event = fs.handle_key(key, ctx.graph);
        match event {
            FindEvent::Cancel => {
                model.close_modal();
                model.status_message = Some(StatusMessage::info("find wizard cancelled"));
            }
            FindEvent::OpenResults(view) => {
                let count = view.rows.len();
                model.active_view = ActiveView::Query(view);
                model.status_message =
                    Some(StatusMessage::info(format!("{count} token(s) matched")));
                model.close_modal();
            }
            FindEvent::Continue => {}
        }
        return Task::none();
    }

    // Naming modal.
    if let Some(Modal::Naming(ref mut ns)) = model.modal_mut() {
        let event = ns.handle_key(key, ctx.graph);
        match event {
            NamingEvent::Cancel => {
                model.close_modal();
                model.status_message = Some(StatusMessage::info("naming wizard cancelled"));
            }
            NamingEvent::Copy(name) => {
                model.status_message =
                    Some(StatusMessage::info(format!("copied: {name}")));
                let text = name.clone();
                return Task::cmd(move || {
                    let err = write_clipboard(&text).err().map(|e| e.to_string());
                    Message::ClipboardDone(err)
                });
            }
            NamingEvent::Continue => {}
        }
        return Task::none();
    }

    // Wizard modal.
    let wctx = ctx.as_wizard_ctx();
    let event = match model.modal_mut() {
        Some(Modal::Wizard(ws)) => ws.handle_key(key, &wctx),
        _ => return Task::none(),
    };

    match event {
        WizardEvent::Cancel => {
            model.close_modal();
            model.status_message = Some(StatusMessage::info("wizard cancelled"));
            Task::cmd(|| { clear_wizard_draft(); Message::Tick })
        }
        WizardEvent::Submit => {
            if !ctx.allow_write {
                model.close_modal();
                model.status_message = Some(StatusMessage::info(
                    "wizard preview ready — pass --allow-write to enable writes",
                ));
                Task::cmd(|| { clear_wizard_draft(); Message::Tick })
            } else {
                // TODO(#1023): extract perform_write into Task::Cmd once WizardState
                // exposes owned submit-data that can be moved into a 'static closure.
                let write_result = if let Some(Modal::Wizard(ref ws)) = model.modal() {
                    Some((ws.assembled_name(), ws.perform_write(&wctx)))
                } else {
                    None
                };
                match write_result {
                    Some((name, Ok(written_path))) => {
                        model.close_modal();
                        model.status_message = Some(StatusMessage::info(
                            format!("wrote {name} → {written_path}"),
                        ));
                        Task::cmd(|| { clear_wizard_draft(); Message::Tick })
                    }
                    Some((_, Err(e))) => {
                        if let Some(Modal::Wizard(ref mut ws)) = model.modal_mut() {
                            ws.error = Some(e);
                        }
                        Task::none()
                    }
                    None => Task::none(),
                }
            }
        }
        WizardEvent::Continue => {
            let draft = if let Some(Modal::Wizard(ref ws)) = model.modal() {
                Some(to_draft(ws))
            } else {
                None
            };
            match draft {
                Some(d) => Task::cmd(move || { save_wizard_draft(&d); Message::Tick }),
                None => Task::none(),
            }
        }
    }
}

// ── Mouse handling ────────────────────────────────────────────────────────────

fn handle_mouse(model: &mut Model, me: crossterm::event::MouseEvent) -> Task<Message> {
    match me.kind {
        MouseEventKind::ScrollUp => {
            scroll_active(model, -1);
        }
        MouseEventKind::ScrollDown => {
            scroll_active(model, 1);
        }
        MouseEventKind::Down(MouseButton::Left) => {
            if model.is_selection_mode_enabled() {
                model.start_selection((me.row, me.column));
            } else {
                click_at(model, me.row, me.column);
            }
        }
        MouseEventKind::Drag(MouseButton::Left) if model.is_selecting() => {
            model.update_selection_end((me.row, me.column));
        }
        MouseEventKind::Up(MouseButton::Left) if model.is_selecting() => {
            if let Some((start, end)) = model.end_selection() {
                // Extract text from hit regions within the selection bounds.
                let text = extract_selection_from_regions(&model.hit_regions, start, end);
                if let Some(t) = text {
                    if !t.is_empty() {
                        return Task::cmd(move || {
                            let err = write_clipboard(&t).err().map(|e| e.to_string());
                            Message::ClipboardDone(err)
                        });
                    }
                }
            }
        }
        _ => {}
    }
    Task::none()
}

fn scroll_active(model: &mut Model, delta: i32) {
    if let Some(modal) = model.modal_mut() {
        if modal.wants_scroll() {
            modal.on_scroll(delta);
        }
        return;
    }
    match &mut model.active_view {
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

fn click_at(model: &mut Model, row: u16, col: u16) {
    let action = model.hit_regions.iter().find_map(|r| {
        if rect_contains(r.rect, row, col) { Some(&r.action) } else { None }
    });
    match action {
        Some(HitAction::SelectListRow(i)) => {
            let i = *i;
            match &mut model.active_view {
                ActiveView::Query(qv) => { qv.table_state.select(Some(i)); }
                ActiveView::Resolve(rv) => { rv.table_state.select(Some(i)); }
                ActiveView::Validate(vv) => { vv.table_state.select(Some(i)); }
                _ => {}
            }
        }
        None => {}
    }
}

// ── Palette submit / command dispatch ─────────────────────────────────────────

fn handle_palette_submit(
    model: &mut Model,
    raw: String,
    ctx: &UpdateCtx<'_>,
) -> Task<Message> {
    // FuzzyFind mode: close without dispatching.
    // When the model is in Browsing mode (e.g. direct PaletteSubmit from tests or replay),
    // treat as command mode — the submit should always dispatch.
    let is_fuzzy = model.palette_mode() == Some(PaletteMode::FuzzyFind);
    if is_fuzzy {
        model.close_palette();
        return Task::none();
    }

    let raw = raw.trim().to_string();
    model.close_palette();

    // Append to history (dedupe head, cap at HISTORY_CAP).
    let history_task = if !raw.is_empty()
        && model.palette_history.first().map(|s| s.as_str()) != Some(raw.as_str())
    {
        model.palette_history.insert(0, raw.clone());
        model.palette_history.truncate(HISTORY_CAP);
        let snap = model.palette_history.clone();
        Task::cmd(move || { save_palette_history(&snap); Message::Tick })
    } else {
        Task::none()
    };

    let (cmd, rest) = match raw.split_once(' ') {
        Some((c, r)) => (c.to_lowercase(), r.trim().to_string()),
        None => (raw.to_lowercase(), String::new()),
    };

    let cmd_task = dispatch_command(model, &cmd, &rest, ctx);

    // Combine history save with command task.
    match (history_task, cmd_task) {
        (Task::None, t) | (t, Task::None) => t,
        (h, c) => Task::batch(vec![h, c]),
    }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/// Drain `model.pending_yank` and, if non-empty, return a `Task::Cmd` that writes
/// to the clipboard. Returns `Task::None` if nothing was pending.
fn clipboard_task_from_yank(model: &mut Model) -> Task<Message> {
    match model.pending_yank.take() {
        Some(text) if !text.is_empty() => Task::cmd(move || {
            let err = write_clipboard(&text).err().map(|e| e.to_string());
            Message::ClipboardDone(err)
        }),
        _ => Task::none(),
    }
}
