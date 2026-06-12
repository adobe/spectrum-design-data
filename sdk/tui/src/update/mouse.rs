// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Mouse event handling — extracted from `update.rs` to stay within the 800-LOC cap
//! enforced by `tests/budget.rs` (GH #1018).

use crossterm::event::{MouseButton, MouseEventKind};

use crate::app::{move_table_selection, rect_contains, ActiveView, HitAction};
use crate::clipboard::write_clipboard;
use crate::message::Message;
use crate::model::Model;
use crate::task::Task;

pub(super) fn handle_mouse(model: &mut Model, me: crossterm::event::MouseEvent) -> Task<Message> {
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
        if rect_contains(r.rect, row, col) {
            Some(&r.action)
        } else {
            None
        }
    });
    match action {
        Some(HitAction::SelectListRow(i)) => {
            let i = *i;
            match &mut model.active_view {
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

/// Extract text from hit regions within a rectangular selection.
fn extract_selection_from_regions(
    regions: &[crate::app::HitRegion],
    start: (u16, u16),
    end: (u16, u16),
) -> Option<String> {
    let (r1, c1) = start;
    let (r2, c2) = end;
    let min_row = r1.min(r2);
    let max_row = r1.max(r2);
    let min_col = c1.min(c2);
    let max_col = c1.max(c2);
    let mut lines: Vec<&str> = Vec::new();
    for region in regions {
        let ry = region.rect.y;
        let rx = region.rect.x;
        let rx_end = rx + region.rect.width;
        if ry >= min_row && ry <= max_row && rx_end > min_col && rx <= max_col {
            lines.push(&region.text);
        }
    }
    if lines.is_empty() {
        None
    } else {
        Some(lines.join("\n"))
    }
}

/// Drain `model.pending_yank` and, if non-empty, return a `Task::Cmd` that writes
/// to the clipboard. Returns `Task::None` if nothing was pending.
pub(super) fn clipboard_task_from_yank(model: &mut Model) -> Task<Message> {
    match model.pending_yank.take() {
        Some(text) if !text.is_empty() => Task::cmd(move || {
            let err = write_clipboard(&text).err().map(|e| e.to_string());
            Message::ClipboardDone(err)
        }),
        _ => Task::none(),
    }
}
