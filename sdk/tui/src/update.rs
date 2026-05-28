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
            model.palette_open = false;
            model.palette_input = tui_input::Input::default();
            model.palette_history_cursor = None;
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
                    if let Some(Modal::Wizard(ref mut ws)) = model.modal {
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
    if model.palette_open {
        return handle_palette_key(model, key);
    }

    // Modal captures all key input when present.
    if model.modal.is_some() {
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
            model.modal = Some(Modal::Help(crate::app::HelpModal { scroll: 0 }));
        }
        KeyCode::Char('v') => {
            model.selection_mode = !model.selection_mode;
            if !model.selection_mode {
                model.sel_start = None;
                model.sel_end = None;
            }
            let label = if model.selection_mode { "on" } else { "off" };
            model.status_message = Some(StatusMessage::info(
                format!("selection mode {label}  (drag to select, release to copy)"),
            ));
        }
        KeyCode::Char(':') => {
            model.palette_open = true;
            model.palette_mode = PaletteMode::Command;
            model.palette_input = tui_input::Input::default();
            model.palette_history_cursor = None;
        }
        KeyCode::Char('/') => {
            model.palette_open = true;
            model.palette_mode = PaletteMode::FuzzyFind;
            model.palette_input = tui_input::Input::default();
            model.palette_history_cursor = None;
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
    match key.code {
        KeyCode::Esc => {
            model.palette_open = false;
            model.palette_input = tui_input::Input::default();
            model.palette_history_cursor = None;
        }
        KeyCode::Enter => {
            // Close the palette. The runtime sends a separate Message::PaletteSubmit
            // after detecting this transition; submit is NOT dispatched here.
            model.palette_open = false;
        }
        KeyCode::Tab if model.palette_mode == PaletteMode::Command => {
            let current = model.palette_input.value().to_string();
            if !current.contains(' ') {
                let matches: Vec<&str> = KNOWN_COMMANDS
                    .iter()
                    .copied()
                    .filter(|&c| c.starts_with(current.as_str()))
                    .collect();
                match matches.len() {
                    0 => {}
                    1 => {
                        model.palette_input =
                            tui_input::Input::from(format!("{} ", matches[0]));
                    }
                    _ => {
                        model.status_message = Some(StatusMessage::info(
                            format!("matches: {}", matches.join(" | ")),
                        ));
                    }
                }
            }
        }
        KeyCode::Up if model.palette_mode == PaletteMode::Command => {
            handle_history_nav(model, true);
        }
        KeyCode::Down if model.palette_mode == PaletteMode::Command => {
            handle_history_nav(model, false);
        }
        _ => {
            model.palette_history_cursor = None;
            model
                .palette_input
                .handle_event(&crossterm::event::Event::Key(key));
        }
    }
    Task::none()
}

fn handle_history_nav(model: &mut Model, older: bool) {
    if older {
        let next = match model.palette_history_cursor {
            None if !model.palette_history.is_empty() => Some(0),
            Some(i) if i + 1 < model.palette_history.len() => Some(i + 1),
            other => other,
        };
        model.palette_history_cursor = next;
        if let Some(i) = next {
            if let Some(entry) = model.palette_history.get(i) {
                model.palette_input = tui_input::Input::from(entry.clone());
            }
        }
    } else {
        let next = model.palette_history_cursor.and_then(|i| {
            if i == 0 { None } else { Some(i - 1) }
        });
        model.palette_history_cursor = next;
        match next {
            Some(i) => {
                if let Some(entry) = model.palette_history.get(i) {
                    model.palette_input = tui_input::Input::from(entry.clone());
                }
            }
            None => {
                model.palette_input = tui_input::Input::default();
            }
        }
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
    if let Some(Modal::Help(ref mut hm)) = model.modal {
        match key.code {
            KeyCode::Esc | KeyCode::Char('?') => {
                model.modal = None;
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
    if let Some(Modal::Find(ref mut fs)) = model.modal {
        let event = fs.handle_key(key, ctx.graph);
        match event {
            FindEvent::Cancel => {
                model.modal = None;
                model.status_message = Some(StatusMessage::info("find wizard cancelled"));
            }
            FindEvent::OpenResults(view) => {
                let count = view.rows.len();
                model.active_view = ActiveView::Query(view);
                model.status_message =
                    Some(StatusMessage::info(format!("{count} token(s) matched")));
                model.modal = None;
            }
            FindEvent::Continue => {}
        }
        return Task::none();
    }

    // Naming modal.
    if let Some(Modal::Naming(ref mut ns)) = model.modal {
        let event = ns.handle_key(key, ctx.graph);
        match event {
            NamingEvent::Cancel => {
                model.modal = None;
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
    let event = match &mut model.modal {
        Some(Modal::Wizard(ws)) => ws.handle_key(key, &wctx),
        _ => return Task::none(),
    };

    match event {
        WizardEvent::Cancel => {
            model.modal = None;
            model.status_message = Some(StatusMessage::info("wizard cancelled"));
            Task::cmd(|| { clear_wizard_draft(); Message::Tick })
        }
        WizardEvent::Submit => {
            if !ctx.allow_write {
                model.modal = None;
                model.status_message = Some(StatusMessage::info(
                    "wizard preview ready — pass --allow-write to enable writes",
                ));
                Task::cmd(|| { clear_wizard_draft(); Message::Tick })
            } else {
                // TODO(#1023): extract perform_write into Task::Cmd once WizardState
                // exposes owned submit-data that can be moved into a 'static closure.
                let write_result = if let Some(Modal::Wizard(ref ws)) = model.modal {
                    Some((ws.assembled_name(), ws.perform_write(&wctx)))
                } else {
                    None
                };
                match write_result {
                    Some((name, Ok(written_path))) => {
                        model.modal = None;
                        model.status_message = Some(StatusMessage::info(
                            format!("wrote {name} → {written_path}"),
                        ));
                        Task::cmd(|| { clear_wizard_draft(); Message::Tick })
                    }
                    Some((_, Err(e))) => {
                        if let Some(Modal::Wizard(ref mut ws)) = model.modal {
                            ws.error = Some(e);
                        }
                        Task::none()
                    }
                    None => Task::none(),
                }
            }
        }
        WizardEvent::Continue => {
            let draft = if let Some(Modal::Wizard(ref ws)) = model.modal {
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
            if model.selection_mode {
                model.sel_start = Some((me.row, me.column));
                model.sel_end = Some((me.row, me.column));
            } else {
                click_at(model, me.row, me.column);
            }
        }
        MouseEventKind::Drag(MouseButton::Left) if model.selection_mode => {
            model.sel_end = Some((me.row, me.column));
        }
        MouseEventKind::Up(MouseButton::Left) if model.selection_mode => {
            let yank = extract_selection(model);
            model.sel_start = None;
            model.sel_end = None;
            if let Some(text) = yank {
                if !text.is_empty() {
                    return Task::cmd(move || {
                        let err = write_clipboard(&text).err().map(|e| e.to_string());
                        Message::ClipboardDone(err)
                    });
                }
            }
        }
        _ => {}
    }
    Task::none()
}

fn scroll_active(model: &mut Model, delta: i32) {
    if let Some(ref mut modal) = model.modal {
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

fn extract_selection(model: &Model) -> Option<String> {
    let (Some((r1, c1)), Some((r2, c2))) = (model.sel_start, model.sel_end) else {
        return None;
    };
    let min_row = r1.min(r2);
    let max_row = r1.max(r2);
    let min_col = c1.min(c2);
    let max_col = c1.max(c2);
    let mut lines: Vec<&str> = Vec::new();
    for region in &model.hit_regions {
        let ry = region.rect.y;
        let rx = region.rect.x;
        let rx_end = rx + region.rect.width;
        if ry >= min_row && ry <= max_row && rx_end > min_col && rx <= max_col {
            lines.push(&region.text);
        }
    }
    if lines.is_empty() { None } else { Some(lines.join("\n")) }
}

// ── Palette submit / command dispatch ─────────────────────────────────────────

fn handle_palette_submit(
    model: &mut Model,
    raw: String,
    ctx: &UpdateCtx<'_>,
) -> Task<Message> {
    // FuzzyFind mode: close without dispatching.
    if model.palette_mode != PaletteMode::Command {
        model.palette_open = false;
        model.palette_input = tui_input::Input::default();
        return Task::none();
    }

    let raw = raw.trim().to_string();
    model.palette_open = false;
    model.palette_input = tui_input::Input::default();
    model.palette_history_cursor = None;

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

fn dispatch_command(
    model: &mut Model,
    cmd: &str,
    rest: &str,
    ctx: &UpdateCtx<'_>,
) -> Task<Message> {
    match cmd {
        "query" => {
            if rest.is_empty() {
                model.status_message =
                    Some(StatusMessage::error("query: expression required"));
                return Task::none();
            }
            match design_data_core::query::parse(rest) {
                Ok(expr) => {
                    let records = design_data_core::query::filter(ctx.graph, &expr);
                    let rows: Vec<QueryRow> =
                        records.iter().map(|r| QueryRow::from_record(r)).collect();
                    let count = rows.len();
                    model.active_view =
                        ActiveView::Query(QueryView::new(rest.to_string(), rows));
                    model.status_message =
                        Some(StatusMessage::info(format!("{count} token(s) matched")));
                }
                Err(e) => {
                    model.status_message =
                        Some(StatusMessage::error(format!("query error: {e}")));
                }
            }
            Task::none()
        }
        "resolve" => {
            if rest.is_empty() {
                model.status_message =
                    Some(StatusMessage::error("resolve: property=<name> required"));
                return Task::none();
            }
            let (prop, res_ctx) = match parse_resolve_args(rest) {
                Ok(v) => v,
                Err(e) => {
                    model.status_message =
                        Some(StatusMessage::error(format!("resolve: {e}")));
                    return Task::none();
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
                model.active_view =
                    ActiveView::Resolve(ResolveView::new(prop, vec![]));
                model.status_message = Some(StatusMessage::info("no match"));
                return Task::none();
            }
            let filtered_graph = design_data_core::graph::TokenGraph::from_records(candidates)
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
            model.active_view = ActiveView::Resolve(ResolveView::new(prop, rows));
            model.status_message =
                Some(StatusMessage::info(format!("{count} candidate(s)")));
            Task::none()
        }
        "describe" | "component" => {
            // TODO(#1023): wrap the fs::read_to_string in Task::Cmd once the
            // runtime can feed the result back as Message::DescribeDone.
            if rest.is_empty() {
                model.status_message =
                    Some(StatusMessage::error("describe: component ID required"));
                return Task::none();
            }
            let id = rest.trim();
            if id.is_empty()
                || !id.chars().next().is_some_and(|c| c.is_ascii_lowercase())
                || !id.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
            {
                model.status_message =
                    Some(StatusMessage::error(format!("invalid component ID '{id}'")));
                return Task::none();
            }
            let Some(comp_dir) = ctx.components_dir else {
                model.status_message = Some(StatusMessage::error(
                    "describe: no components directory available",
                ));
                return Task::none();
            };
            let file_path = comp_dir.join(format!("{id}.json"));
            if file_path.is_file() {
                match std::fs::read_to_string(&file_path) {
                    Ok(raw_text) => match serde_json::from_str::<serde_json::Value>(&raw_text) {
                        Ok(doc) => match serde_json::to_string_pretty(&doc) {
                            Ok(pretty) => {
                                model.active_view = ActiveView::Describe(DescribeView {
                                    component: id.to_string(),
                                    pretty_json: pretty,
                                    scroll: 0,
                                });
                                model.status_message = None;
                            }
                            Err(e) => {
                                model.status_message = Some(StatusMessage::error(
                                    format!("describe: render error: {e}"),
                                ));
                            }
                        },
                        Err(e) => {
                            model.status_message = Some(StatusMessage::error(
                                format!("describe: parse error: {e}"),
                            ));
                        }
                    },
                    Err(e) => {
                        model.status_message = Some(StatusMessage::error(
                            format!("describe: read error: {e}"),
                        ));
                    }
                }
            } else {
                let available: Vec<&str> =
                    ctx.graph.components.iter().map(|c| c.name.as_str()).collect();
                let suggestion = build_did_you_mean(id, &available);
                model.status_message = Some(StatusMessage::error(format!(
                    "component '{id}' not found{suggestion}"
                )));
            }
            Task::none()
        }
        "validate" => {
            // TODO(#1023): wrap validate_all_with_options_and_names in Task::Cmd.
            let (Some(dataset_path), Some(schema_registry)) =
                (ctx.dataset_path, ctx.schema_registry)
            else {
                model.status_message = Some(StatusMessage::error(
                    "validate: requires --dataset and schema registry",
                ));
                return Task::none();
            };
            use design_data_core::validate;
            match validate::validate_all_with_options_and_names(
                dataset_path,
                schema_registry,
                &HashSet::new(),
                ctx.mode_sets_dir,
                ctx.components_dir,
                None,
            ) {
                Ok(report) => {
                    use crate::app::DiagnosticRow;
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
                    model.active_view = ActiveView::Validate(ValidateView::new(rows));
                    model.status_message =
                        Some(StatusMessage::info(format!("{count} finding(s)")));
                }
                Err(e) => {
                    model.status_message =
                        Some(StatusMessage::error(format!("validate: {e}")));
                }
            }
            Task::none()
        }
        "find" => {
            let fs = FindWizardState::new_with_intent(rest.trim());
            model.modal = Some(Modal::Find(Box::new(fs)));
            model.status_message = None;
            Task::none()
        }
        "name" => {
            let mut ns = NamingWizardState::new_with_intent(rest.trim());
            ns.refresh_suggestions(ctx.graph);
            model.modal = Some(Modal::Naming(Box::new(ns)));
            model.status_message = None;
            Task::none()
        }
        "new" | "create" => {
            let mut ws = WizardState::new_with_intent(rest.trim());
            ws.refresh_suggestions(ctx.graph);
            model.modal = Some(Modal::Wizard(Box::new(ws)));
            model.status_message = None;
            Task::none()
        }
        other => {
            model.status_message =
                Some(StatusMessage::error(format!("unknown command: {other}")));
            Task::none()
        }
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

fn build_did_you_mean(id: &str, available: &[&str]) -> String {
    if available.is_empty() {
        return String::new();
    }
    // Safe: callers validate that id is ASCII-only before reaching this point
    // (the is_ascii_lowercase / is_ascii_digit / '-' guard in dispatch_command).
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
    if matches.is_empty() {
        format!(" — available: {}", available.join(", "))
    } else {
        format!(" — did you mean: {}", matches.join(", "))
    }
}
