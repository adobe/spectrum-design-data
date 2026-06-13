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
use common::{empty_graph, key, render_to_buffer, update_ctx};

use crossterm::event::KeyCode;
use design_data_tui::{command::Command, update, Message, Model};

fn type_str(model: &mut Model, ctx: &design_data_tui::UpdateCtx<'_>, s: &str) {
    for c in s.chars() {
        update(model, Message::Key(key(KeyCode::Char(c))), ctx);
    }
}

// The palette is always open on a fresh Model — no `:` opener needed.

#[test]
fn tab_completes_query() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    type_str(&mut model, &ctx, "qu");
    // "qu" matches query and quit; first (query) wins.
    update(&mut model, Message::Key(key(KeyCode::Tab)), &ctx);
    assert_eq!(model.palette_input_value(), "query ");
}

#[test]
fn tab_completes_resolve() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    type_str(&mut model, &ctx, "re");
    update(&mut model, Message::Key(key(KeyCode::Tab)), &ctx);
    assert_eq!(model.palette_input_value(), "resolve ");
}

#[test]
fn tab_completes_describe() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    type_str(&mut model, &ctx, "d");
    update(&mut model, Message::Key(key(KeyCode::Tab)), &ctx);
    assert_eq!(model.palette_input_value(), "describe ");
}

#[test]
fn tab_completes_validate() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    type_str(&mut model, &ctx, "v");
    update(&mut model, Message::Key(key(KeyCode::Tab)), &ctx);
    assert_eq!(model.palette_input_value(), "validate ");
}

#[test]
fn tab_on_empty_input_completes_to_first_command() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    // Empty input → all commands match; Tab completes to the first (query).
    update(&mut model, Message::Key(key(KeyCode::Tab)), &ctx);
    assert_eq!(model.palette_input_value(), "query ");
}

#[test]
fn tab_after_space_is_noop() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    type_str(&mut model, &ctx, "query ");
    update(&mut model, Message::Key(key(KeyCode::Tab)), &ctx);
    assert_eq!(model.palette_input_value(), "query ");
}

#[test]
fn tab_on_no_match_is_noop() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    type_str(&mut model, &ctx, "zzz");
    update(&mut model, Message::Key(key(KeyCode::Tab)), &ctx);
    assert_eq!(model.palette_input_value(), "zzz");
}

#[test]
fn typing_accumulates_characters_in_input() {
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    type_str(&mut model, &ctx, "fin");
    assert_eq!(model.palette_input_value(), "fin");
}

// ── Fuzzy matching tests ──────────────────────────────────────────────────────

#[test]
fn fuzzy_subsequence_completes_validate() {
    // "vld" is not a prefix but it is a subsequence of "validate".
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    type_str(&mut model, &ctx, "vld");
    update(&mut model, Message::Key(key(KeyCode::Tab)), &ctx);
    assert_eq!(model.palette_input_value(), "validate ");
}

#[test]
fn fuzzy_subsequence_completes_resolve() {
    // "rslv" is a subsequence of "resolve".
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    type_str(&mut model, &ctx, "rslv");
    update(&mut model, Message::Key(key(KeyCode::Tab)), &ctx);
    assert_eq!(model.palette_input_value(), "resolve ");
}

#[test]
fn fuzzy_ranks_describe_above_validate_for_d() {
    // "d" is a boundary match for "describe" (first char) and a mid-word match
    // for "validate". The boundary bonus should put describe first.
    let matches = Command::matches("d");
    assert!(!matches.is_empty(), "expected at least one match for 'd'");
    assert_eq!(
        matches[0].command,
        Command::Describe,
        "describe should rank first for 'd' (boundary bonus); got {:?}",
        matches[0].command
    );
    let has_validate = matches.iter().any(|m| m.command == Command::Validate);
    assert!(has_validate, "validate should also match 'd'");
}

#[test]
fn fuzzy_matches_returns_highlight_indices_for_query() {
    // "query" chars: q=0, u=1, e=2, r=3, y=4.
    // "qry" matches: q→0, r→3, y→4.
    let matches = Command::matches("qry");
    let qm = matches.iter().find(|m| m.command == Command::Query);
    assert!(qm.is_some(), "query should match 'qry'");
    let indices = &qm.unwrap().indices;
    assert!(
        !indices.is_empty(),
        "matched indices must be non-empty for 'qry'"
    );
    assert_eq!(indices, &vec![0usize, 3, 4]);
}

#[test]
fn fuzzy_empty_input_returns_all_commands_with_empty_indices() {
    let matches = Command::matches("");
    assert_eq!(matches.len(), Command::ALL.len());
    for m in &matches {
        assert!(
            m.indices.is_empty(),
            "empty query should produce no highlight indices"
        );
    }
}

#[test]
fn fuzzy_no_match_returns_empty() {
    let matches = Command::matches("zzz");
    assert!(matches.is_empty(), "zzz should not match any command");
}

#[test]
fn fuzzy_render_shows_expected_command_first() {
    // Type "d": "describe" gets a boundary bonus (d=index 0) → score 6;
    // "validate" matches mid-word (d=index 4, no boundary) → score 1.
    // Both must appear in the buffer and describe must come first.
    let graph = empty_graph();
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    type_str(&mut model, &ctx, "d");
    let buf = render_to_buffer(&mut model, 120, 36);
    let mut describe_row: Option<u16> = None;
    let mut validate_row: Option<u16> = None;
    for y in 0..36 {
        let row: String = (0..120u16)
            .map(|x| buf.cell((x, y)).map(|c| c.symbol()).unwrap_or(" "))
            .collect();
        if row.contains("describe") && describe_row.is_none() {
            describe_row = Some(y);
        }
        if row.contains("validate") && validate_row.is_none() {
            validate_row = Some(y);
        }
    }
    assert!(
        describe_row.is_some(),
        "describe must appear in the buffer for input 'd'"
    );
    assert!(
        validate_row.is_some(),
        "validate must also appear in the buffer for input 'd'"
    );
    assert!(
        describe_row < validate_row,
        "describe (row {describe_row:?}) should rank above validate (row {validate_row:?}) for input 'd'"
    );
}
