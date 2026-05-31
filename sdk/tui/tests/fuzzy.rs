// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Live `/` fuzzy-find palette behavior (GH #1079).

mod common;
use common::{key, make_graph_with_tokens, render_to_buffer, update_ctx};

use crossterm::event::KeyCode;
use design_data_tui::app::ActiveView;
use design_data_tui::{update, Message, Model};

/// Drive a string of character keystrokes through `update`.
fn type_str(model: &mut Model, ctx: &design_data_tui::UpdateCtx<'_>, text: &str) {
    for c in text.chars() {
        update(model, Message::Key(key(KeyCode::Char(c))), ctx);
    }
}

fn row_names(model: &Model) -> Vec<String> {
    if let ActiveView::Query(ref qv) = model.active_view {
        qv.rows.iter().map(|r| r.name.clone()).collect()
    } else {
        panic!("expected Query view, got something else");
    }
}

#[test]
fn slash_seeds_all_tokens() {
    let graph = make_graph_with_tokens(&["accent-background", "neutral-background", "button"]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Char('/'))), &ctx);
    assert!(model.is_palette_open());
    assert_eq!(row_names(&model).len(), 3);
}

#[test]
fn typing_narrows_results_live() {
    let graph = make_graph_with_tokens(&["accent-background", "neutral-background", "button"]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Char('/'))), &ctx);
    type_str(&mut model, &ctx, "bg");
    // "button" has no 'g' after its 'b', so only the two backgrounds match.
    let names = row_names(&model);
    assert_eq!(names.len(), 2);
    assert!(names.iter().all(|n| n.contains("background")));
}

#[test]
fn backspace_widens_results_live() {
    let graph = make_graph_with_tokens(&["accent-background", "neutral-background", "button"]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Char('/'))), &ctx);
    type_str(&mut model, &ctx, "bg");
    assert_eq!(row_names(&model).len(), 2);
    update(&mut model, Message::Key(key(KeyCode::Backspace)), &ctx);
    // Query is now just "b" — all three tokens contain a 'b'.
    assert_eq!(row_names(&model).len(), 3);
}

#[test]
fn enter_commits_filtered_view() {
    let graph = make_graph_with_tokens(&["accent-background", "neutral-background", "button"]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Char('/'))), &ctx);
    type_str(&mut model, &ctx, "bg");
    update(&mut model, Message::Key(key(KeyCode::Enter)), &ctx);
    assert!(!model.is_palette_open());
    assert_eq!(row_names(&model).len(), 2);
    // Committing must not surface an error (e.g. "unknown command").
    assert!(model.status_message.is_none());
}

#[test]
fn esc_restores_previous_view() {
    let graph = make_graph_with_tokens(&["accent-background", "neutral-background", "button"]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    // Establish a prior results view via a command submit.
    update(
        &mut model,
        Message::PaletteSubmit("query property=*".into()),
        &ctx,
    );
    let before = match model.active_view {
        ActiveView::Query(ref qv) => qv.expr_text.clone(),
        _ => panic!("expected Query view from command submit"),
    };

    // Open fuzzy-find, narrow to nothing, then cancel.
    update(&mut model, Message::Key(key(KeyCode::Char('/'))), &ctx);
    type_str(&mut model, &ctx, "zzz");
    assert_eq!(row_names(&model).len(), 0);
    update(&mut model, Message::Key(key(KeyCode::Esc)), &ctx);

    assert!(!model.is_palette_open());
    match model.active_view {
        ActiveView::Query(ref qv) => assert_eq!(qv.expr_text, before),
        _ => panic!("expected the prior Query view to be restored"),
    }
}

#[test]
fn fuzzy_view_titled_fuzzy_not_query() {
    let graph = make_graph_with_tokens(&["accent-background", "neutral-background", "button"]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Char('/'))), &ctx);
    type_str(&mut model, &ctx, "bg");

    let buf = render_to_buffer(&mut model, 80, 24);
    let mut all = String::new();
    for y in 0..24 {
        for x in 0..80 {
            all.push_str(buf.cell((x, y)).unwrap().symbol());
        }
        all.push('\n');
    }
    assert!(all.contains("Fuzzy: /bg"), "expected 'Fuzzy: /bg' title");
    assert!(!all.contains("Query: bg"), "must not mislabel as a Query");
}

#[test]
fn ranked_best_match_first() {
    let graph = make_graph_with_tokens(&["color-background", "character-bg"]);
    let ctx = update_ctx(&graph);
    let mut model = Model::new();
    update(&mut model, Message::Key(key(KeyCode::Char('/'))), &ctx);
    type_str(&mut model, &ctx, "bg");
    // "character-bg" has a consecutive, boundary "bg" run and should rank first.
    let names = row_names(&model);
    assert_eq!(names.first().map(String::as_str), Some("character-bg"));
}
