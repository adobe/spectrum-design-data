// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

mod common;
use common::{empty_graph, key, update_ctx};

use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};
use design_data_tui::app::PaletteMode;
use design_data_tui::{update, Message, Model};

fn ctrl(c: char) -> KeyEvent {
    KeyEvent::new(KeyCode::Char(c), KeyModifiers::CONTROL)
}

#[test]
fn colon_opens_palette_in_command_mode() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Char(':'))), &ctx);
    assert!(model.palette_open);
    assert_eq!(model.palette_mode, PaletteMode::Command);
}

#[test]
fn slash_opens_palette_in_fuzzy_find_mode() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Char('/'))), &ctx);
    assert!(model.palette_open);
    assert_eq!(model.palette_mode, PaletteMode::FuzzyFind);
}

#[test]
fn esc_closes_palette() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Char(':'))), &ctx);
    assert!(model.palette_open);
    update(&mut model, Message::Key(key(KeyCode::Esc)), &ctx);
    assert!(!model.palette_open);
}

#[test]
fn q_quits_when_palette_closed() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Char('q'))), &ctx);
    assert!(model.quit);
}

#[test]
fn q_does_not_quit_when_palette_open() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Char(':'))), &ctx);
    update(&mut model, Message::Key(key(KeyCode::Char('q'))), &ctx);
    assert!(!model.quit);
    assert!(model.palette_open);
}

#[test]
fn ctrl_c_always_quits() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Char(':'))), &ctx);
    assert!(model.palette_open);
    update(&mut model, Message::Key(ctrl('c')), &ctx);
    assert!(model.quit);
}

#[test]
fn esc_clears_palette_input() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Char(':'))), &ctx);
    for c in "foo".chars() {
        update(&mut model, Message::Key(key(KeyCode::Char(c))), &ctx);
    }
    update(&mut model, Message::Key(key(KeyCode::Esc)), &ctx);
    assert!(!model.palette_open);
    assert!(model.palette_input.value().is_empty());
}

#[test]
fn palette_prefix_command() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Char(':'))), &ctx);
    assert_eq!(model.palette_prefix(), ":");
}

#[test]
fn palette_prefix_fuzzy_find() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Char('/'))), &ctx);
    assert_eq!(model.palette_prefix(), "/");
}

#[test]
fn colon_while_palette_open_goes_to_input_buffer() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Char(':'))), &ctx); // open palette
    update(&mut model, Message::Key(key(KeyCode::Char(':'))), &ctx); // forwarded to input
    assert!(model.palette_open);
    assert_eq!(model.palette_input.value(), ":");
}
