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
use design_data_tui::app::App;

fn key(code: KeyCode) -> KeyEvent {
    KeyEvent::new(code, KeyModifiers::NONE)
}

fn open_palette(app: &mut App) {
    app.handle_key(key(KeyCode::Char(':')));
}

fn type_str(app: &mut App, s: &str) {
    for c in s.chars() {
        app.handle_key(key(KeyCode::Char(c)));
    }
}

#[test]
fn tab_completes_query() {
    let mut app = App::new();
    open_palette(&mut app);
    type_str(&mut app, "q");
    app.handle_key(key(KeyCode::Tab));
    assert_eq!(app.palette_input.value(), "query ");
}

#[test]
fn tab_completes_resolve() {
    let mut app = App::new();
    open_palette(&mut app);
    type_str(&mut app, "re");
    app.handle_key(key(KeyCode::Tab));
    assert_eq!(app.palette_input.value(), "resolve ");
}

#[test]
fn tab_completes_describe() {
    let mut app = App::new();
    open_palette(&mut app);
    type_str(&mut app, "d");
    app.handle_key(key(KeyCode::Tab));
    assert_eq!(app.palette_input.value(), "describe ");
}

#[test]
fn tab_completes_validate() {
    let mut app = App::new();
    open_palette(&mut app);
    type_str(&mut app, "v");
    app.handle_key(key(KeyCode::Tab));
    assert_eq!(app.palette_input.value(), "validate ");
}

#[test]
fn ambiguous_prefix_sets_status_and_leaves_buffer_unchanged() {
    // "r" matches resolve (and only resolve with current set, but let's use "")
    // Use "q" which is unambiguous — use a prefix that matches multiple:
    // Actually all current commands start with unique first letters.
    // "re" vs "res" — let's use an empty string which matches all 4.
    // Or type nothing and tab:
    let mut app = App::new();
    open_palette(&mut app);
    // Empty prefix — matches all 4 commands → ambiguous.
    app.handle_key(key(KeyCode::Tab));
    assert_eq!(app.palette_input.value(), ""); // buffer unchanged
    let msg = app.status_message.as_ref().map(|m| m.text.as_str()).unwrap_or("");
    assert!(
        msg.contains("matches:"),
        "expected 'matches:' in status: {msg}"
    );
}

#[test]
fn tab_after_space_is_noop() {
    let mut app = App::new();
    open_palette(&mut app);
    type_str(&mut app, "query ");
    app.handle_key(key(KeyCode::Tab));
    // Buffer should remain "query " — Tab inside argument is ignored.
    assert_eq!(app.palette_input.value(), "query ");
}

#[test]
fn tab_on_no_match_is_noop() {
    let mut app = App::new();
    open_palette(&mut app);
    type_str(&mut app, "zzz");
    app.handle_key(key(KeyCode::Tab));
    assert_eq!(app.palette_input.value(), "zzz");
}

#[test]
fn tab_in_fuzzy_mode_is_noop() {
    let mut app = App::new();
    app.handle_key(key(KeyCode::Char('/'))); // open in fuzzy mode
    type_str(&mut app, "q");
    app.handle_key(key(KeyCode::Tab));
    // Tab does nothing in fuzzy mode — no autocomplete.
    assert_eq!(app.palette_input.value(), "q");
}
