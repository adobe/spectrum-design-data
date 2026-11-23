// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Overlays drawn over the active view: the wizard-help panel, the Help modal and the
//! `:preview` modal. Their keys are handled before the wizard or view behind them sees them.

use crossterm::event::{KeyCode, KeyEvent};

use super::ctx::UpdateCtx;
use crate::app::{Modal, StatusMessage};
use crate::message::Message;
use crate::model::Model;
use crate::preview::PreviewState;
use crate::task::Task;

/// Route `key` to an open overlay. `Some` when one took it, so the caller stops there.
pub(super) fn route_key(
    model: &mut Model,
    key: KeyEvent,
    ctx: &UpdateCtx<'_>,
) -> Option<Task<Message>> {
    // Wizard-help overlay (? pressed while a wizard/modal is active). This layer
    // captures all navigation input so the wizard behind it is not affected.
    if let Some(ref mut scroll) = model.wizard_help_scroll {
        match key.code {
            KeyCode::Esc | KeyCode::Char('?') => {
                model.wizard_help_scroll = None;
            }
            KeyCode::Up | KeyCode::Char('k') => {
                *scroll = scroll.saturating_sub(1);
            }
            KeyCode::Down | KeyCode::Char('j') => {
                *scroll = scroll.saturating_add(1);
            }
            KeyCode::PageUp => {
                *scroll = scroll.saturating_sub(10);
            }
            KeyCode::PageDown => {
                *scroll = scroll.saturating_add(10);
            }
            _ => {}
        }
        return Some(Task::none());
    }

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
        return Some(Task::none());
    }

    if let Some(Modal::Preview(_)) = model.modal() {
        return Some(preview_key(model, key.code, ctx));
    }
    None
}

/// Keys in the preview: `c` light/dark, `s` next size, `t` next state (each draws again),
/// `Esc` or `q` closes. Every other key is ignored so nothing behind the overlay reacts.
fn preview_key(model: &mut Model, code: KeyCode, ctx: &UpdateCtx<'_>) -> Task<Message> {
    let Some(Modal::Preview(pv)) = model.modal() else {
        return Task::none();
    };
    let next = match code {
        KeyCode::Esc | KeyCode::Char('q') => {
            model.close_modal();
            return Task::none();
        }
        KeyCode::Char('c') => pv.request.toggle_scheme(),
        KeyCode::Char('s') => pv.request.next_size(&pv.sizes),
        KeyCode::Char('t') => pv.request.next_state(),
        _ => return Task::none(),
    };
    match ctx.preview.clone() {
        Some(source) => Task::cmd(move || Message::PreviewDone(Box::new(source.render(&next)))),
        None => Task::none(),
    }
}

/// A preview finished drawing. It opens the overlay (or replaces the open one); it never
/// replaces a different modal the user has since opened. A failed redraw keeps the picture
/// on screen and says why in the footer.
pub(super) fn preview_done(model: &mut Model, result: Result<PreviewState, String>) {
    match (result, model.modal_mut()) {
        (Ok(state), Some(Modal::Preview(open))) => **open = state,
        (Err(e), Some(Modal::Preview(open))) => open.notes.insert(0, e),
        (_, Some(_)) => {}
        (Ok(state), None) => {
            model.open_modal(Modal::Preview(Box::new(state)));
            model.status_message = None;
        }
        (Err(e), None) => {
            model.status_message = Some(StatusMessage::error(e));
            model.return_home_keep_status();
        }
    }
}
