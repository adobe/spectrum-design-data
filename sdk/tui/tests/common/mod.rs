// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

use crossterm::event::{KeyCode, KeyEvent, KeyEventKind, KeyEventState, KeyModifiers};
use design_data_core::graph::{Layer, TokenGraph, TokenRecord};
use design_data_tui::theme::Theme;
use design_data_tui::{dispatch, update, Message, Model, Task, UpdateCtx, UpdateCtxBuilder};
use ratatui::backend::TestBackend;
use ratatui::buffer::Buffer;
use ratatui::Terminal;
use serde_json::json;
use std::path::PathBuf;

/// Build a `KeyEvent` (Press, no modifiers) for the given key code.
pub fn key(code: KeyCode) -> KeyEvent {
    KeyEvent {
        code,
        modifiers: KeyModifiers::NONE,
        kind: KeyEventKind::Press,
        state: KeyEventState::NONE,
    }
}

/// Standard 2-token graph used across most test suites.
pub fn make_graph() -> TokenGraph {
    make_graph_with_tokens(&[
        "accent-background-color-default",
        "neutral-background-color-default",
    ])
}

/// Build a graph from a list of token names. Each token gets `value = "red"` and
/// a `name.property` field matching the name itself, so `property=<name>` queries work.
pub fn make_graph_with_tokens(names: &[&str]) -> TokenGraph {
    let records: Vec<TokenRecord> = names
        .iter()
        .enumerate()
        .map(|(i, &name)| TokenRecord {
            name: name.to_string(),
            file: PathBuf::from("test.json"),
            index: i,
            schema_url: None,
            uuid: None,
            alias_target: None,
            raw: json!({
                "value": "red",
                "name": { "property": name }
            }),
            layer: Layer::Foundation,
        })
        .collect();
    TokenGraph::from_records(records)
}

/// Empty graph — useful for testing empty-state rendering and error paths.
pub fn empty_graph() -> TokenGraph {
    make_graph_with_tokens(&[])
}

/// Minimal `UpdateCtx` for tests that only need key/palette/modal behavior.
pub fn update_ctx(graph: &TokenGraph) -> UpdateCtx<'_> {
    UpdateCtx::minimal(graph)
}

/// Primer line shown in the header during test renders.
pub const TEST_PRIMER: &str = "test · 0 tokens";

/// Render `model` via `design_data_tui::draw` into a `TestBackend` and return the `Buffer`.
pub fn render_to_buffer(model: &mut Model, w: u16, h: u16) -> Buffer {
    let backend = TestBackend::new(w, h);
    let mut terminal = Terminal::new(backend).unwrap();
    terminal
        .draw(|f| design_data_tui::draw(model, f, &Theme::terminal(), TEST_PRIMER))
        .unwrap();
    terminal.backend().buffer().clone()
}

// ── Builder convenience ───────────────────────────────────────────────────────

/// Fluent-builder entry point for [`UpdateCtx`].
///
/// Equivalent to `UpdateCtx::builder(graph)`. Call setters only for the fields
/// you need, then call `.build()`. Use [`update_ctx`] for the minimal no-IO variant.
///
/// # Example
/// ```ignore
/// let ctx = update_ctx_builder(&graph)
///     .dataset_path(tmp.path())
///     .schema_registry(Arc::new(registry))
///     .build();
/// ```
pub fn update_ctx_builder(graph: &TokenGraph) -> UpdateCtxBuilder<'_> {
    UpdateCtx::builder(graph)
}

// ── Dispatch / settle helper ──────────────────────────────────────────────────

/// Drive `msg` through `update` **and execute its resulting `Task`** synchronously.
///
/// Use this instead of calling [`update`] directly when the message triggers an
/// IO command — e.g. `describe` (FS read), `validate` (FS scan), or wizard write.
/// Calling plain `update` for those messages leaves the model unsettled because
/// the returned `Task::Cmd` closure never runs.
///
/// For pure key/palette/modal transitions, plain [`update`] is sufficient.
pub fn settle(model: &mut Model, msg: Message, ctx: &UpdateCtx<'_>) {
    dispatch(model, msg, ctx);
}

// ── Input helpers ─────────────────────────────────────────────────────────────

/// Feed a string as individual `Message::Key(Char(c))` events.
///
/// Replaces the common test pattern:
/// ```ignore
/// for c in s.chars() { update(model, Message::Key(key(KeyCode::Char(c))), ctx); }
/// ```
pub fn type_str(model: &mut Model, ctx: &UpdateCtx<'_>, s: &str) {
    for c in s.chars() {
        update(model, Message::Key(key(KeyCode::Char(c))), ctx);
    }
}

/// Feed a sequence of key codes as `Message::Key` events.
///
/// Replaces repeated `update(model, Message::Key(key(code)), ctx)` calls.
pub fn feed_keys(model: &mut Model, ctx: &UpdateCtx<'_>, codes: &[KeyCode]) {
    for &code in codes {
        update(model, Message::Key(key(code)), ctx);
    }
}

// ── Task-intent assertion helpers ─────────────────────────────────────────────

/// Assert that `update` scheduled a side-effect command anywhere in the task tree.
///
/// Uses [`Task::has_cmd`] rather than [`Task::is_cmd`] so the assertion is true
/// even when the command is nested inside a `Task::Batch` (which happens when a
/// palette command is combined with a history-save task).
///
/// Use when a message *should* produce IO work (clipboard, FS write, FS read).
/// `context` is included in the failure message for orientation.
///
/// Complement: [`assert_no_effect`].
#[track_caller]
pub fn assert_emits_cmd(task: &Task<Message>, context: &str) {
    assert!(
        task.has_cmd(),
        "expected a side-effect command (Task::Cmd or Batch with Cmd) but got none: {context}"
    );
}

/// Assert that `update` produced no side effects.
///
/// Use when a transition should be purely in-memory with no IO scheduled.
/// `context` is included in the failure message for orientation.
///
/// Complement: [`assert_emits_cmd`].
#[track_caller]
pub fn assert_no_effect(task: &Task<Message>, context: &str) {
    assert!(
        task.is_none(),
        "expected Task::None (no side effect) but got a command: {context}"
    );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[test]
fn render_to_buffer_does_not_panic_on_empty_model() {
    let mut model = Model::new();
    let buf = render_to_buffer(&mut model, 80, 24);
    assert_eq!(buf.area().width, 80);
    assert_eq!(buf.area().height, 24);
}

#[test]
fn update_ctx_builder_produces_minimal_ctx() {
    let graph = make_graph();
    let ctx = update_ctx_builder(&graph).build();
    assert!(!ctx.allow_write);
    assert!(ctx.dataset_path.is_none());
    assert!(ctx.components_dir.is_none());
    assert!(ctx.schema_registry.is_none());
}

#[test]
fn update_ctx_builder_allow_write_sets_flag() {
    let graph = make_graph();
    let ctx = update_ctx_builder(&graph).allow_write().build();
    assert!(ctx.allow_write);
}

#[test]
fn settle_helper_settles_pure_transition() {
    let graph = make_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    // A pure message — settle should work just like update for these.
    settle(&mut model, Message::Key(key(KeyCode::Char(':'))), &ctx);
    assert!(model.is_palette_open(), "palette should open after ':'");
}

#[test]
fn type_str_helper_feeds_chars() {
    let graph = make_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Char(':'))), &ctx);
    type_str(&mut model, &ctx, "qs");
    // Typing characters in palette mode should be reflected in the input.
    assert!(
        model.is_palette_open(),
        "palette should still be open after typing"
    );
}

#[test]
fn feed_keys_helper_feeds_sequence() {
    let graph = make_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    feed_keys(&mut model, &ctx, &[KeyCode::Char(':'), KeyCode::Esc]);
    assert!(
        !model.is_palette_open(),
        "Esc after ':' should close palette"
    );
}

#[test]
fn assert_no_effect_passes_on_task_none() {
    let task: Task<Message> = Task::none();
    assert_no_effect(&task, "Task::none should produce no effect");
}

#[test]
fn assert_emits_cmd_passes_on_task_cmd() {
    let task: Task<Message> = Task::cmd(|| Message::Tick);
    assert_emits_cmd(&task, "Task::cmd should count as a side effect");
}

#[test]
fn assert_emits_cmd_passes_on_batch_containing_cmd() {
    let task: Task<Message> = Task::batch(vec![Task::none(), Task::cmd(|| Message::Tick)]);
    assert_emits_cmd(&task, "Batch with Cmd should count as a side effect");
}

#[test]
fn empty_graph_has_no_tokens() {
    let graph = empty_graph();
    assert!(graph.tokens.is_empty(), "empty_graph() should contain zero tokens");
}
