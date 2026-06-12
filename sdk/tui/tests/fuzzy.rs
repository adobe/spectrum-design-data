// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Tests for the `find` command and verifying the old `/`-triggered live fuzzy
//! palette has been removed (GH #1079).
//! Token fuzzy search is now accessed via the `find` command which opens
//! the fuzzy-find modal. The ranking algorithm (`fuzzy::rank_token_rows`) is
//! tested indirectly through the find modal.

mod common;
use common::{key, make_graph_with_tokens, update_ctx};

use crossterm::event::KeyCode;
use design_data_tui::app::ActiveView;
use design_data_tui::{update, Message, Model};

// ── '/' is no longer a special trigger ────────────────────────────────────────

#[test]
fn slash_goes_to_input_buffer() {
    let graph = make_graph_with_tokens(&["accent-background"]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    // '/' is now just a character typed into the palette input.
    update(&mut model, Message::Key(key(KeyCode::Char('/'))), &ctx);
    assert!(model.is_palette_open(), "palette stays open");
    assert_eq!(model.palette_input_value(), "/");
    // The active view remains Empty — no live fuzzy filtering.
    assert!(matches!(model.active_view, ActiveView::Empty));
}

// ── `find` command opens the fuzzy modal ─────────────────────────────────────

#[test]
fn find_command_opens_modal() {
    use design_data_tui::app::Modal;
    let graph = make_graph_with_tokens(&["accent-background"]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::PaletteSubmit("find".into()), &ctx);
    assert!(model.is_modal_open(), "find should open the fuzzy modal");
    assert!(
        matches!(model.modal(), Some(Modal::Find(_))),
        "modal should be Modal::Find"
    );
}
