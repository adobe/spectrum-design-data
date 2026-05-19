// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};
use design_data_tui::app::{App, PaletteMode};

fn key(code: KeyCode) -> KeyEvent {
    KeyEvent::new(code, KeyModifiers::NONE)
}

fn ctrl(c: char) -> KeyEvent {
    KeyEvent::new(KeyCode::Char(c), KeyModifiers::CONTROL)
}

#[test]
fn colon_opens_palette_in_command_mode() {
    let mut app = App::new();
    app.handle_key(key(KeyCode::Char(':')));
    assert!(app.palette_open);
    assert_eq!(app.palette_mode, PaletteMode::Command);
}

#[test]
fn slash_opens_palette_in_fuzzy_find_mode() {
    let mut app = App::new();
    app.handle_key(key(KeyCode::Char('/')));
    assert!(app.palette_open);
    assert_eq!(app.palette_mode, PaletteMode::FuzzyFind);
}

#[test]
fn esc_closes_palette() {
    let mut app = App::new();
    app.handle_key(key(KeyCode::Char(':')));
    assert!(app.palette_open);
    app.handle_key(key(KeyCode::Esc));
    assert!(!app.palette_open);
}

#[test]
fn q_quits_when_palette_closed() {
    let mut app = App::new();
    app.handle_key(key(KeyCode::Char('q')));
    assert!(app.quit);
}

#[test]
fn q_does_not_quit_when_palette_open() {
    let mut app = App::new();
    app.handle_key(key(KeyCode::Char(':')));
    app.handle_key(key(KeyCode::Char('q')));
    assert!(!app.quit);
    assert!(app.palette_open);
}

#[test]
fn ctrl_c_always_quits() {
    let mut app = App::new();
    app.handle_key(key(KeyCode::Char(':')));
    assert!(app.palette_open);
    app.handle_key(ctrl('c'));
    assert!(app.quit);
}

#[test]
fn esc_clears_palette_input() {
    let mut app = App::new();
    app.handle_key(key(KeyCode::Char(':')));
    app.handle_key(key(KeyCode::Char('f')));
    app.handle_key(key(KeyCode::Char('o')));
    app.handle_key(key(KeyCode::Char('o')));
    app.handle_key(key(KeyCode::Esc));
    assert!(!app.palette_open);
    assert!(app.palette_input.value().is_empty());
}

#[test]
fn palette_prefix_command() {
    let mut app = App::new();
    app.handle_key(key(KeyCode::Char(':')));
    assert_eq!(app.palette_prefix(), ":");
}

#[test]
fn palette_prefix_fuzzy_find() {
    let mut app = App::new();
    app.handle_key(key(KeyCode::Char('/')));
    assert_eq!(app.palette_prefix(), "/");
}

#[test]
fn colon_while_palette_open_goes_to_input_buffer() {
    let mut app = App::new();
    app.handle_key(key(KeyCode::Char(':'))); // open palette
    app.handle_key(key(KeyCode::Char(':'))); // forwarded to input, not re-open
    assert!(app.palette_open);
    assert_eq!(app.palette_input.value(), ":");
}
