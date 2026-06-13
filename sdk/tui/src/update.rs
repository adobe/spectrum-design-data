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
//! All side effects now dispatch via `Task::Cmd`: clipboard yanks, the
//! `--allow-write` wizard write (`WriteDone`), the `describe` FS read
//! (`DescribeDone`), and the `validate` FS scan (`ValidateDone`). The completion
//! messages feed back through `update` to settle the resulting view.

pub(crate) mod command;
pub mod ctx;
mod mouse;

use crossterm::event::{KeyCode, KeyModifiers};
use design_data_core::write::write_token;
use tui_input::backend::crossterm::EventHandler;

use crate::app::{
    move_table_selection, select_edge, ActiveView, Modal, StatusMessage, ValidateView,
};
use crate::clipboard::write_clipboard;
use crate::command::Command;
use crate::find::FindEvent;
use crate::message::Message;
use crate::model::Model;
use crate::naming::NamingEvent;
use crate::task::Task;
use crate::wizard::draft::{clear_wizard_draft, save_wizard_draft, to_draft};
use crate::wizard::WizardEvent;
use command::handle_palette_submit;
use ctx::UpdateCtx;

/// Columns moved per h/l horizontal-scroll step in the describe view.
const H_SCROLL_STEP: u16 = 4;

// ── Entry point ───────────────────────────────────────────────────────────────

/// The single state-transition function for the TUI runtime.
///
/// Routes `msg` through the appropriate handler based on current `model` state,
/// mutates `model` in place, and returns a `Task` describing any side effects
/// to execute outside this call (FS writes, clipboard, etc.).
///
/// **In tests**: for messages that trigger IO commands (e.g. `describe`,
/// `validate`, wizard write), call [`crate::runtime::dispatch`] instead of
/// this function directly — `dispatch` runs the returned `Task` to completion
/// so the model is fully settled before you assert. Plain `update` is fine for
/// pure key/palette/modal transitions.
pub fn update(model: &mut Model, msg: Message, ctx: &UpdateCtx<'_>) -> Task<Message> {
    match msg {
        Message::Key(key) => handle_key(model, key, ctx),
        Message::Mouse(me) => mouse::handle_mouse(model, me),
        Message::PaletteSubmit(raw) => handle_palette_submit(model, raw, ctx),
        Message::PaletteCancel => {
            // Palette cancel returns home (the palette is always open there).
            model.return_home();
            Task::none()
        }
        Message::PaletteHistoryNav { older } => {
            handle_history_nav(model, older);
            Task::none()
        }
        Message::WriteDone(result) => {
            match result {
                Ok((name, path)) => {
                    model.close_modal();
                    model.status_message = Some(StatusMessage::info(format!(
                        "wrote {name} → {}",
                        path.display()
                    )));
                    Task::cmd(|| {
                        clear_wizard_draft();
                        Message::Tick
                    })
                }
                Err(e) => {
                    // Keep the wizard open so the user can correct the error.
                    if let Some(Modal::Wizard(ref mut ws)) = model.modal_mut() {
                        ws.error = Some(e);
                    }
                    Task::none()
                }
            }
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
            model.status_message = Some(StatusMessage::error(format!(
                "clipboard unavailable: {err}"
            )));
            Task::none()
        }
        Message::DescribeDone(result) => {
            match *result {
                Ok(view) => {
                    model.active_view = ActiveView::Describe(view);
                    model.status_message = None;
                    // Transition to Browsing so the results view has keyboard focus.
                    model.close_palette();
                }
                Err(e) => {
                    model.status_message = Some(StatusMessage::error(e));
                    // Command failed — return to the home palette with the error visible.
                    model.return_home_keep_status();
                }
            }
            Task::none()
        }
        Message::ValidateDone(result) => {
            match *result {
                Ok(rows) => {
                    let count = rows.len();
                    model.active_view = ActiveView::Validate(ValidateView::new(rows));
                    model.status_message = Some(StatusMessage::info(format!("{count} finding(s)")));
                    // Transition to Browsing so the results view has keyboard focus.
                    model.close_palette();
                }
                Err(e) => {
                    model.status_message = Some(StatusMessage::error(e));
                    // Command failed — return to the home palette with the error visible.
                    model.return_home_keep_status();
                }
            }
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
        return handle_palette_key(model, key, ctx);
    }

    // Modal captures all key input when present.
    if model.is_modal_open() {
        return route_modal_key(model, key, ctx);
    }

    // View-specific keys (navigation, yank).
    if handle_view_key(model, key.code) {
        // 'y' key sets model.pending_yank; drain it here and return a clipboard Task.
        return mouse::clipboard_task_from_yank(model);
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
            model.status_message = Some(StatusMessage::info(format!(
                "selection mode {label}  (drag to select, release to copy)"
            )));
        }
        _ => {}
    }
    Task::none()
}

fn handle_palette_key(
    model: &mut Model,
    key: crossterm::event::KeyEvent,
    ctx: &UpdateCtx<'_>,
) -> Task<Message> {
    match key.code {
        // ── Esc ──────────────────────────────────────────────────────────────
        KeyCode::Esc => {
            if model.palette_list_selected().is_some() {
                // Exit the list zone; focus returns to the input line.
                if let Some(ps) = model.palette_state_mut() {
                    ps.list_selected = None;
                }
            } else {
                // Clear the input if non-empty; otherwise no-op. Palette stays open.
                let is_empty = model.palette_input_value().is_empty();
                if !is_empty {
                    if let Some(ps) = model.palette_state_mut() {
                        ps.history_cursor = None;
                        ps.input = tui_input::Input::default();
                    }
                }
            }
        }

        // ── Enter ─────────────────────────────────────────────────────────────
        //
        // We call handle_palette_submit directly rather than closing the palette
        // and relying on the runtime loop, because the runtime captures the input
        // value BEFORE processing the key event. Calling submit here gives us
        // full control over which command string is executed.
        KeyCode::Enter => {
            let current = model.palette_input_value().to_string();
            let list_sel = model.palette_list_selected();
            let filtered = Command::filter(&current);

            let submit_str: Option<String> = if let Some(i) = list_sel {
                // List zone: run the highlighted command by canonical name.
                filtered.get(i).map(|cmd| cmd.canonical().to_string())
            } else if current.is_empty() {
                // Empty input — no-op.
                None
            } else if current.contains(' ') {
                // Typed args win: submit verbatim.
                Some(current)
            } else {
                // Single token: complete to the top filtered match.
                filtered.first().map(|cmd| cmd.canonical().to_string())
            };

            if let Some(raw) = submit_str {
                // Reset list zone before submitting.
                if let Some(ps) = model.palette_state_mut() {
                    ps.list_selected = None;
                }
                return handle_palette_submit(model, raw, ctx);
            }
        }

        // ── Tab ───────────────────────────────────────────────────────────────
        KeyCode::Tab => {
            let current = model.palette_input_value().to_string();
            if !current.contains(' ') {
                let list_sel = model.palette_list_selected();
                let filtered = Command::filter(&current);
                // In list zone: complete to the selected row; else the top match.
                let target = if let Some(i) = list_sel {
                    filtered.get(i).copied()
                } else {
                    filtered.first().copied()
                };
                if let Some(cmd) = target {
                    let new_input = tui_input::Input::from(format!("{} ", cmd.canonical()));
                    if let Some(ps) = model.palette_state_mut() {
                        ps.input = new_input;
                        ps.history_cursor = None;
                        ps.list_selected = None;
                    }
                }
            }
        }

        // ── Up ────────────────────────────────────────────────────────────────
        KeyCode::Up => {
            let list_sel = model.palette_list_selected();
            match list_sel {
                Some(0) => {
                    // At the top of the list — exit the list zone.
                    if let Some(ps) = model.palette_state_mut() {
                        ps.list_selected = None;
                    }
                }
                Some(i) => {
                    // Move selection up within the list.
                    if let Some(ps) = model.palette_state_mut() {
                        ps.list_selected = Some(i - 1);
                    }
                }
                None => {
                    // Not in list zone — recall history.
                    handle_history_nav(model, true);
                }
            }
        }

        // ── Down ──────────────────────────────────────────────────────────────
        KeyCode::Down => {
            let list_sel = model.palette_list_selected();
            let input_empty = model.palette_input_value().is_empty();
            let history_cur = model.palette_history_cursor();

            match list_sel {
                Some(i) => {
                    // Already in the list — move down, clamping at the last entry.
                    let len = Command::filter(model.palette_input_value()).len();
                    if let Some(ps) = model.palette_state_mut() {
                        ps.list_selected = Some((i + 1).min(len.saturating_sub(1)));
                    }
                }
                None if input_empty && history_cur.is_none() => {
                    // Empty prompt, not in history recall — drop into the list.
                    let len = Command::filter("").len();
                    if len > 0 {
                        if let Some(ps) = model.palette_state_mut() {
                            ps.list_selected = Some(0);
                        }
                    }
                }
                None if history_cur.is_some() => {
                    // In history recall — navigate to a newer entry.
                    handle_history_nav(model, false);
                }
                None => {
                    // No-op: user is typing, not in history recall or list zone.
                }
            }
        }

        // ── '?' opens help even from the home palette ─────────────────────────
        KeyCode::Char('?') => {
            model.open_modal(Modal::Help(crate::app::HelpModal { scroll: 0 }));
        }

        // ── Default: feed character into the input buffer ─────────────────────
        _ => {
            if let Some(ps) = model.palette_state_mut() {
                ps.history_cursor = None;
                ps.list_selected = None; // typing resets list selection
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
            // Return to the home screen — re-arms the palette (invariant: Empty → InPalette).
            model.return_home();
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
                let l = vv.visible_len();
                move_table_selection(&mut vv.table_state, l, -1);
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
                let l = vv.visible_len();
                move_table_selection(&mut vv.table_state, l, 1);
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
        // h/Left · l/Right: horizontal scroll in describe view (H_SCROLL_STEP columns per step).
        KeyCode::Left | KeyCode::Char('h') => {
            if let ActiveView::Describe(ref mut dv) = model.active_view {
                dv.h_scroll = dv.h_scroll.saturating_sub(H_SCROLL_STEP);
                true
            } else {
                false
            }
        }
        KeyCode::Right | KeyCode::Char('l') => {
            if let ActiveView::Describe(ref mut dv) = model.active_view {
                let max_h = dv.max_line_width();
                dv.h_scroll = dv
                    .h_scroll
                    .saturating_add(H_SCROLL_STEP)
                    .min(max_h.saturating_sub(1));
                true
            } else {
                false
            }
        }
        // Enter: expand/collapse the selected group in the validate view.
        KeyCode::Enter => match &mut model.active_view {
            ActiveView::Validate(vv) => {
                vv.toggle_selected();
                true
            }
            _ => false,
        },
        // g/G: jump to first/last row (vim convention, tui-conventions.md §1).
        KeyCode::Char('g') => match &mut model.active_view {
            ActiveView::Query(qv) => {
                select_edge(&mut qv.table_state, qv.rows.len(), false);
                true
            }
            ActiveView::Resolve(rv) => {
                select_edge(&mut rv.table_state, rv.rows.len(), false);
                true
            }
            ActiveView::Validate(vv) => {
                let l = vv.visible_len();
                select_edge(&mut vv.table_state, l, false);
                true
            }
            ActiveView::Describe(dv) => {
                dv.scroll = 0;
                dv.h_scroll = 0;
                true
            }
            ActiveView::Empty => false,
        },
        KeyCode::Char('G') => match &mut model.active_view {
            ActiveView::Query(qv) => {
                select_edge(&mut qv.table_state, qv.rows.len(), true);
                true
            }
            ActiveView::Resolve(rv) => {
                select_edge(&mut rv.table_state, rv.rows.len(), true);
                true
            }
            ActiveView::Validate(vv) => {
                let l = vv.visible_len();
                select_edge(&mut vv.table_state, l, true);
                true
            }
            ActiveView::Describe(dv) => {
                let max_scroll = dv.pretty_json.lines().count().saturating_sub(1) as u16;
                dv.scroll = max_scroll;
                dv.h_scroll = 0;
                true
            }
            ActiveView::Empty => false,
        },
        KeyCode::Char('y') => {
            let yank = match &model.active_view {
                ActiveView::Query(qv) => qv.selected_row().map(|r| r.name.clone()),
                ActiveView::Resolve(rv) => rv.selected_row().map(|r| r.name.clone()),
                ActiveView::Validate(vv) => vv.selected_text(),
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
        let event = fs.handle_key(key, ctx.graph, &ctx.token_index);
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
                model.status_message = Some(StatusMessage::info(format!("copied: {name}")));
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
            Task::cmd(|| {
                clear_wizard_draft();
                Message::Tick
            })
        }
        WizardEvent::Submit => {
            if !ctx.allow_write {
                model.close_modal();
                model.status_message = Some(StatusMessage::info(
                    "wizard preview ready — pass --allow-write to enable writes",
                ));
                Task::cmd(|| {
                    clear_wizard_draft();
                    Message::Tick
                })
            } else {
                // Build the owned write input synchronously (no I/O), then dispatch
                // the actual disk write as a Task::Cmd. The modal stays open until
                // WriteDone reports success, so write errors can be surfaced in place.
                // The assembled name is captured now so the confirmation can name the
                // token (WriteDone only carries owned data).
                let (name, input) = match model.modal() {
                    Some(Modal::Wizard(ws)) => (
                        ws.assembled_name(),
                        ws.build_write_input(ctx.dataset_path, ctx.graph),
                    ),
                    _ => return Task::none(),
                };
                let registry = ctx.schema_registry.clone();
                match (input, registry) {
                    (Ok(input), Some(registry)) => Task::cmd(move || {
                        let result = write_token(input, &registry)
                            .map(|out| (name, out.written_to))
                            .map_err(|e| e.to_string());
                        Message::WriteDone(result)
                    }),
                    (Ok(_), None) => {
                        if let Some(Modal::Wizard(ref mut ws)) = model.modal_mut() {
                            ws.error = Some(
                                "no schema registry available — run from the repo root \
                                 or pass --schema-path"
                                    .to_string(),
                            );
                        }
                        Task::none()
                    }
                    (Err(e), _) => {
                        if let Some(Modal::Wizard(ref mut ws)) = model.modal_mut() {
                            ws.error = Some(e);
                        }
                        Task::none()
                    }
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
                Some(d) => Task::cmd(move || {
                    save_wizard_draft(&d);
                    Message::Tick
                }),
                None => Task::none(),
            }
        }
    }
}
