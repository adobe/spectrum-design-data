// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Task-intent assertions: verify that `update` schedules the correct side effect
//! for each IO command (clipboard, write, describe, validate).
//!
//! These tests complement the replay-parity tests: `replay.rs` checks render
//! correctness but explicitly does *not* check side-effect intent (see
//! `replay.rs:127`). This file fills that gap by asserting on `Task::is_cmd()`.

mod common;
use common::{assert_emits_cmd, assert_no_effect, key, make_graph_with_tokens, update_ctx};

use crossterm::event::KeyCode;
use design_data_tui::app::ActiveView;
use design_data_tui::{update, Message, Model};

// ── Clipboard yank ────────────────────────────────────────────────────────────

/// Pressing 'y' in a query view with a selected row emits a clipboard `Task::Cmd`.
#[test]
fn yank_in_query_view_emits_clipboard_cmd() {
    let graph = make_graph_with_tokens(&["accent-background-color-default"]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();

    // Open a query view with results.
    update(
        &mut model,
        Message::PaletteSubmit("query property=*".into()),
        &ctx,
    );
    assert!(
        matches!(model.active_view, ActiveView::Query(_)),
        "expected Query view"
    );

    // 'y' should schedule a clipboard write command.
    let task = update(&mut model, Message::Key(key(KeyCode::Char('y'))), &ctx);
    assert_emits_cmd(&task, "'y' in query view should emit clipboard Task::Cmd");
}

/// Pressing 'y' in the resolve view emits a clipboard `Task::Cmd`.
#[test]
fn yank_in_resolve_view_emits_clipboard_cmd() {
    let graph = make_graph_with_tokens(&["accent-background-color-default"]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();

    update(
        &mut model,
        Message::PaletteSubmit("resolve property=accent-background-color-default".into()),
        &ctx,
    );
    assert!(
        matches!(model.active_view, ActiveView::Resolve(_)),
        "expected Resolve view after 'resolve property=accent-background-color-default'"
    );
    let task = update(&mut model, Message::Key(key(KeyCode::Char('y'))), &ctx);
    assert_emits_cmd(&task, "'y' in resolve view should emit clipboard Task::Cmd");
}

/// 'y' outside a table view (in Empty state) emits no command.
#[test]
fn yank_with_no_selection_emits_no_effect() {
    let graph = make_graph_with_tokens(&["accent-background-color-default"]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new(); // starts in Empty

    let task = update(&mut model, Message::Key(key(KeyCode::Char('y'))), &ctx);
    assert_no_effect(&task, "'y' in empty state should produce no side effect");
}

// ── Write (wizard submit) ─────────────────────────────────────────────────────

/// `WriteDone(Ok(...))` emits a `Task::Cmd` to clear the wizard draft.
#[test]
fn write_done_ok_emits_draft_clear_cmd() {
    use std::path::PathBuf;
    let graph = make_graph_with_tokens(&["accent-background-color-default"]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    // Open wizard modal so it can be closed by WriteDone.
    update(
        &mut model,
        Message::PaletteSubmit("new background-color".into()),
        &ctx,
    );
    assert!(model.is_modal_open(), "wizard should be open");

    let task = update(
        &mut model,
        Message::WriteDone(Ok((
            "background-color".to_string(),
            PathBuf::from("/tmp/foundation.json"),
        ))),
        &ctx,
    );
    assert_emits_cmd(&task, "WriteDone(Ok) should emit Task::Cmd for draft clear");
}

/// `WriteDone(Err(...))` keeps the wizard open and emits no side effect.
#[test]
fn write_done_err_emits_no_effect() {
    let graph = make_graph_with_tokens(&["accent-background-color-default"]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(
        &mut model,
        Message::PaletteSubmit("new background-color".into()),
        &ctx,
    );
    assert!(model.is_modal_open(), "wizard should be open");

    let task = update(
        &mut model,
        Message::WriteDone(Err("disk full".into())),
        &ctx,
    );
    assert_no_effect(&task, "WriteDone(Err) should produce no side effect");
    assert!(
        model.is_modal_open(),
        "wizard should stay open on write error"
    );
}

// ── Navigation — pure transitions must NOT emit side effects ──────────────────

/// 'j' / 'k' navigation in a query view produces no command (pure model update).
#[test]
fn query_navigation_emits_no_side_effect() {
    let graph = make_graph_with_tokens(&[
        "accent-background-color-default",
        "neutral-background-color-default",
    ]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();

    update(
        &mut model,
        Message::PaletteSubmit("query property=*".into()),
        &ctx,
    );

    let task_j = update(&mut model, Message::Key(key(KeyCode::Char('j'))), &ctx);
    assert_no_effect(&task_j, "'j' navigation should produce no side effect");

    let task_k = update(&mut model, Message::Key(key(KeyCode::Char('k'))), &ctx);
    assert_no_effect(&task_k, "'k' navigation should produce no side effect");
}

/// Opening the palette emits no command.
#[test]
fn palette_open_emits_no_side_effect() {
    let graph = make_graph_with_tokens(&["accent-background-color-default"]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();

    let task = update(&mut model, Message::Key(key(KeyCode::Char(':'))), &ctx);
    assert_no_effect(&task, "':' to open palette should produce no side effect");
    assert!(model.is_palette_open());
}
