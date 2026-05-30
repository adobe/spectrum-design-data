// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

use crossterm::event::{
    KeyCode, KeyEvent, KeyEventKind, KeyEventState, KeyModifiers, MouseEvent, MouseEventKind,
};
use design_data_core::graph::{Layer, TokenGraph, TokenRecord};
use design_data_tui::theme::Theme;
use design_data_tui::{Model, UpdateCtx};
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

/// Build a mouse event at the given terminal cell.
pub fn mouse(kind: MouseEventKind, row: u16, col: u16) -> MouseEvent {
    MouseEvent {
        kind,
        row,
        column: col,
        modifiers: KeyModifiers::NONE,
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

#[test]
fn render_to_buffer_does_not_panic_on_empty_model() {
    let mut model = Model::new();
    let buf = render_to_buffer(&mut model, 80, 24);
    assert_eq!(buf.area().width, 80);
    assert_eq!(buf.area().height, 24);
}
