// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Toast overlay render tests and update-handler tests.
//!
//! Covers: toast appears in the rendered buffer, disappears after ToastExpired,
//! and the existing bottom-strip/help invariants are unaffected.

mod common;
use common::{make_graph_with_tokens, render_to_buffer, update_ctx};

use crossterm::event::KeyCode;
use design_data_tui::app::StatusKind;
use design_data_tui::{update, Message, Model};

// ── Helpers ───────────────────────────────────────────────────────────────────

const W: u16 = 80;
const H: u16 = 24;

fn row_str(buf: &ratatui::buffer::Buffer, y: u16, w: u16) -> String {
    (0..w)
        .map(|x| buf.cell((x, y)).unwrap().symbol().to_string())
        .collect()
}

fn any_row_contains(buf: &ratatui::buffer::Buffer, needle: &str, w: u16, h: u16) -> bool {
    (0..h).any(|y| row_str(buf, y, w).contains(needle))
}

fn key(code: KeyCode) -> crossterm::event::KeyEvent {
    crossterm::event::KeyEvent::new(code, crossterm::event::KeyModifiers::NONE)
}

// ── Toast render ──────────────────────────────────────────────────────────────

#[test]
fn toast_text_appears_in_buffer_when_set() {
    let mut model = Model::new();
    model.set_toast("✓ copied", StatusKind::Info);
    let buf = render_to_buffer(&mut model, W, H);
    assert!(
        any_row_contains(&buf, "copied", W, H),
        "toast text should appear somewhere in the rendered buffer"
    );
}

#[test]
fn no_toast_renders_no_copied_text_by_default() {
    let mut model = Model::new();
    // No toast set; "copied" must not appear on a fresh home screen.
    let buf = render_to_buffer(&mut model, W, H);
    assert!(
        !any_row_contains(&buf, "copied", W, H),
        "no toast should be visible on a fresh model"
    );
}

#[test]
fn toast_text_absent_after_clear() {
    let mut model = Model::new();
    model.set_toast("✓ copied", StatusKind::Info);
    model.clear_toast();
    let buf = render_to_buffer(&mut model, W, H);
    assert!(
        !any_row_contains(&buf, "copied", W, H),
        "cleared toast must not appear in buffer"
    );
}

// ── Update: ToastExpired ──────────────────────────────────────────────────────

#[test]
fn toast_expired_clears_toast() {
    let graph = make_graph_with_tokens(&[]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    model.set_toast("going away", StatusKind::Info);
    assert!(model.toast().is_some());

    update(&mut model, Message::ToastExpired, &ctx);

    assert!(
        model.toast().is_none(),
        "ToastExpired must clear model.toast"
    );
}

#[test]
fn clipboard_done_none_sets_toast() {
    let graph = make_graph_with_tokens(&[]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();

    // ClipboardDone(None) is the clipboard-write success path.
    update(&mut model, Message::ClipboardDone(None), &ctx);

    let toast = model
        .toast()
        .expect("ClipboardDone(None) should set a toast");
    assert!(
        toast.text.contains("copied"),
        "toast text should mention 'copied', got: {}",
        toast.text
    );
    assert_eq!(toast.kind, StatusKind::Info);
}

// ── Existing invariant: Help modal still shows title ──────────────────────────

#[test]
fn help_modal_still_renders_title_after_tui_popup_swap() {
    let graph = make_graph_with_tokens(&[]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Char('?'))), &ctx);
    let buf = render_to_buffer(&mut model, W, H);
    assert!(
        any_row_contains(&buf, "Help", W, H),
        "Help modal title should still render"
    );
}
