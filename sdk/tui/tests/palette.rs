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

// ── Palette always open on home ───────────────────────────────────────────────

#[test]
fn palette_is_open_on_new_model() {
    let model = Model::new();
    // The home screen is always InPalette(Command) — no key needed.
    assert!(model.is_palette_open());
    assert_eq!(model.palette_mode(), Some(PaletteMode::Command));
}

#[test]
fn palette_prefix_is_arrow() {
    let model = Model::new();
    assert_eq!(model.palette_prefix(), "> ");
}

// ── Esc clears input but stays open (home palette invariant) ──────────────────

#[test]
fn esc_clears_non_empty_input_but_keeps_palette_open() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    for c in "foo".chars() {
        update(&mut model, Message::Key(key(KeyCode::Char(c))), &ctx);
    }
    assert_eq!(model.palette_input_value(), "foo");
    update(&mut model, Message::Key(key(KeyCode::Esc)), &ctx);
    // Input is cleared but the palette stays open (it IS the home screen).
    assert!(model.is_palette_open());
    assert!(model.palette_input_value().is_empty());
}

#[test]
fn esc_on_empty_input_is_noop() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    assert!(model.palette_input_value().is_empty());
    update(&mut model, Message::Key(key(KeyCode::Esc)), &ctx);
    assert!(model.is_palette_open());
    assert!(model.palette_input_value().is_empty());
}

// ── q no longer quits; quit command does ─────────────────────────────────────

#[test]
fn q_does_not_quit() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    // 'q' is now just typed into the palette input, it is not a quit binding.
    update(&mut model, Message::Key(key(KeyCode::Char('q'))), &ctx);
    assert!(!model.quit);
    assert_eq!(model.palette_input_value(), "q");
}

// ── Ctrl-C always quits ───────────────────────────────────────────────────────

#[test]
fn ctrl_c_always_quits() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    assert!(model.is_palette_open());
    update(&mut model, Message::Key(ctrl('c')), &ctx);
    assert!(model.quit);
}

// ── typing goes into the input buffer ────────────────────────────────────────

#[test]
fn typing_fills_palette_input() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    for c in "query".chars() {
        update(&mut model, Message::Key(key(KeyCode::Char(c))), &ctx);
    }
    assert_eq!(model.palette_input_value(), "query");
}

// ── quit command quits ────────────────────────────────────────────────────────

#[test]
fn quit_command_sets_model_quit() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    // Submit "quit" via PaletteSubmit (simulates typing quit + Enter).
    use design_data_tui::runtime::dispatch;
    dispatch(&mut model, Message::PaletteSubmit("quit".to_string()), &ctx);
    assert!(model.quit);
}

// ── return_home re-arms the palette ──────────────────────────────────────────

#[test]
fn return_home_re_arms_palette() {
    let mut model = Model::new();
    model.return_home();
    assert!(model.is_palette_open());
    assert_eq!(model.palette_mode(), Some(PaletteMode::Command));
    assert!(model.palette_input_value().is_empty());
}

// ── Command-list navigation ───────────────────────────────────────────────────

#[test]
fn down_on_empty_prompt_enters_list_at_row_0() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Down)), &ctx);
    assert_eq!(
        model.palette_list_selected(),
        Some(0),
        "Down on empty prompt should enter the command list at row 0"
    );
}

#[test]
fn down_in_list_advances_selection() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Down)), &ctx); // enter list at 0
    update(&mut model, Message::Key(key(KeyCode::Down)), &ctx); // → 1
    assert_eq!(model.palette_list_selected(), Some(1));
}

#[test]
fn down_clamps_at_last_entry() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    // Drive Down many times — should stop at the last command.
    for _ in 0..20 {
        update(&mut model, Message::Key(key(KeyCode::Down)), &ctx);
    }
    let len = design_data_tui::command::Command::filter("").len();
    assert_eq!(
        model.palette_list_selected(),
        Some(len - 1),
        "Down should clamp at the last entry"
    );
}

#[test]
fn up_in_list_moves_selection_up() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Down)), &ctx); // → Some(0)
    update(&mut model, Message::Key(key(KeyCode::Down)), &ctx); // → Some(1)
    update(&mut model, Message::Key(key(KeyCode::Up)), &ctx); // → Some(0)
    assert_eq!(model.palette_list_selected(), Some(0));
}

#[test]
fn up_at_row_0_exits_list() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Down)), &ctx); // → Some(0)
    update(&mut model, Message::Key(key(KeyCode::Up)), &ctx); // exit list
    assert_eq!(
        model.palette_list_selected(),
        None,
        "Up at row 0 should exit the list zone"
    );
}

#[test]
fn esc_in_list_exits_to_input() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Down)), &ctx); // enter list
    assert_eq!(model.palette_list_selected(), Some(0));
    update(&mut model, Message::Key(key(KeyCode::Esc)), &ctx);
    assert_eq!(
        model.palette_list_selected(),
        None,
        "Esc in list zone should exit to input"
    );
    assert!(
        model.is_palette_open(),
        "palette should stay open after Esc from list"
    );
}

#[test]
fn typing_resets_list_selection() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Down)), &ctx); // enter list
    assert_eq!(model.palette_list_selected(), Some(0));
    update(&mut model, Message::Key(key(KeyCode::Char('q'))), &ctx);
    assert_eq!(
        model.palette_list_selected(),
        None,
        "typing should reset list selection"
    );
}

#[test]
fn enter_in_list_runs_selected_command() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    // Find where 'quit' sits in the unfiltered list — avoids hardcoding an index.
    let cmds = design_data_tui::command::Command::filter("");
    let quit_idx = cmds
        .iter()
        .position(|c| c.canonical() == "quit")
        .expect("quit must be a registered command");
    // Navigate Down to the quit row.
    for _ in 0..=quit_idx {
        update(&mut model, Message::Key(key(KeyCode::Down)), &ctx);
    }
    assert_eq!(model.palette_list_selected(), Some(quit_idx));
    // Press Enter to run the highlighted 'quit' command.
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx);
    // 'quit' sets model.quit = true (no view transition — reconciliation leaves
    // the palette open, but the quit flag is what matters).
    assert!(
        model.quit,
        "Enter on 'quit' in the list should set model.quit"
    );
}

#[test]
fn enter_on_empty_input_is_noop() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    // Empty input, not in list zone — Enter should be a no-op.
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx);
    assert!(
        model.is_palette_open(),
        "Enter on empty input should not close the palette"
    );
}

#[test]
fn enter_with_args_submits_verbatim() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    for c in "query bg/*".chars() {
        update(&mut model, Message::Key(key(KeyCode::Char(c))), &ctx);
    }
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx);
    // "typed args win" — the full verbatim string "query bg/*" is dispatched.
    // Regardless of whether the query expression parses successfully, the command
    // string is committed to palette history (which is what "submitted verbatim" means).
    // After Enter the palette input is always reset (via return_home or close_palette).
    assert_eq!(
        model.palette_history.first().map(|s| s.as_str()),
        Some("query bg/*"),
        "verbatim command+args string should be in history after Enter"
    );
    // Input is cleared in all paths (palette re-armed or browsing mode).
    assert!(
        model.palette_input_value().is_empty(),
        "palette input is cleared after Enter"
    );
}

#[test]
fn enter_with_single_token_completes_to_top_match() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    for c in "val".chars() {
        update(&mut model, Message::Key(key(KeyCode::Char(c))), &ctx);
    }
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx);
    // "val" → Enter should complete to "validate" (top filtered match) and submit it.
    // The history records what was actually dispatched (the completed name).
    assert_eq!(
        model.palette_history.first().map(|s| s.as_str()),
        Some("validate"),
        "single-token input should complete to the top match before submitting"
    );
    // Input is cleared in all paths (palette re-armed or browsing mode).
    assert!(
        model.palette_input_value().is_empty(),
        "palette input is cleared after Enter"
    );
}

#[test]
fn down_on_nonempty_prompt_does_not_enter_list() {
    // When the user is in history recall (non-empty prompt), Down navigates to
    // a newer history entry rather than dropping into the command list.
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    model.palette_history = vec!["query foo".to_string()];
    // Up recalls the history entry (puts history_cursor at Some(0)).
    update(&mut model, Message::Key(key(KeyCode::Up)), &ctx);
    assert_eq!(model.palette_history_cursor(), Some(0));
    // Down on a non-empty prompt navigates toward newer history, not the list.
    update(&mut model, Message::Key(key(KeyCode::Down)), &ctx);
    assert_eq!(
        model.palette_list_selected(),
        None,
        "Down on non-empty prompt should not enter the list zone"
    );
    // History cursor moves past the newest entry and is cleared.
    assert_eq!(
        model.palette_history_cursor(),
        None,
        "Down should advance history cursor toward newer entry"
    );
}

#[test]
fn down_with_typed_input_is_noop() {
    // Bug guard: when the user has typed something (no history recall active),
    // Down should not enter the list AND should not clear the input.
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    for c in "val".chars() {
        update(&mut model, Message::Key(key(KeyCode::Char(c))), &ctx);
    }
    assert_eq!(model.palette_input_value(), "val");
    update(&mut model, Message::Key(key(KeyCode::Down)), &ctx);
    assert_eq!(
        model.palette_input_value(),
        "val",
        "Down with typed input should not erase the buffer"
    );
    assert_eq!(
        model.palette_list_selected(),
        None,
        "Down with typed input should not enter the command list"
    );
}

#[test]
fn tab_in_list_completes_to_selected_command() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Down)), &ctx); // enter list at 0
    update(&mut model, Message::Key(key(KeyCode::Down)), &ctx); // → 1
    update(&mut model, Message::Key(key(KeyCode::Tab)), &ctx);
    // The second command in the list (with empty input = all commands)
    // should be autocompleted into the input.
    let cmds = design_data_tui::command::Command::filter("");
    if let Some(cmd) = cmds.get(1) {
        assert_eq!(
            model.palette_input_value(),
            format!("{} ", cmd.canonical()),
            "Tab in list zone should complete to the selected command"
        );
    }
    // After Tab, the list selection should be cleared.
    assert_eq!(model.palette_list_selected(), None);
}
