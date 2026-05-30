// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Msg-stream record/replay tests (GH #1025).

mod common;
use common::{make_graph_with_tokens, update_ctx, TEST_PRIMER};

use design_data_tui::theme::Theme;
use design_data_tui::{replay, Message, Model};
use ratatui::backend::TestBackend;
use ratatui::Terminal;

// ── Helper ────────────────────────────────────────────────────────────────────

fn replay_messages(
    messages: Vec<Message>,
    graph: &design_data_core::graph::TokenGraph,
) -> ratatui::buffer::Buffer {
    let ctx = update_ctx(graph);
    let backend = TestBackend::new(80, 24);
    let mut terminal = Terminal::new(backend).unwrap();
    replay(
        &mut terminal,
        Model::new(),
        &ctx,
        &Theme::terminal(),
        TEST_PRIMER,
        messages.into_iter(),
    )
    .unwrap();
    terminal.backend().buffer().clone()
}

// ── Serialization round-trip ──────────────────────────────────────────────────

#[test]
fn message_serializes_and_deserializes_palette_submit() {
    let msg = Message::PaletteSubmit("query property=foo".into());
    let json = serde_json::to_string(&msg).unwrap();
    let restored: Message = serde_json::from_str(&json).unwrap();
    assert!(matches!(restored, Message::PaletteSubmit(ref s) if s == "query property=foo"));
}

#[test]
fn ndjson_stream_round_trips() {
    let messages = vec![
        Message::PaletteSubmit("query property=accent-color".into()),
        Message::PaletteCancel,
    ];
    let ndjson: String = messages
        .iter()
        .map(|m| serde_json::to_string(m).unwrap())
        .collect::<Vec<_>>()
        .join("\n");

    let restored: Vec<Message> = ndjson
        .lines()
        .filter_map(|l| serde_json::from_str(l).ok())
        .collect();

    assert_eq!(restored.len(), 2);
    assert!(matches!(restored[0], Message::PaletteSubmit(_)));
    assert!(matches!(restored[1], Message::PaletteCancel));
}

// ── Replay correctness ────────────────────────────────────────────────────────

#[test]
fn replay_empty_stream_renders_initial_state() {
    let graph = make_graph_with_tokens(&[]);
    let buf = replay_messages(vec![], &graph);
    // Primer arrow is always present.
    assert_eq!(buf.cell((0, 0)).unwrap().symbol(), "▶");
}

#[test]
fn replay_query_command_shows_token_in_buffer() {
    let graph = make_graph_with_tokens(&["accent-color"]);
    let buf = replay_messages(
        vec![Message::PaletteSubmit("query property=accent-color".into())],
        &graph,
    );
    let found = (0..24u16).any(|y| {
        let row: String = (0..80u16)
            .map(|x| buf.cell((x, y)).unwrap().symbol().to_string())
            .collect();
        row.contains("accent-color")
    });
    assert!(
        found,
        "replayed buffer should show 'accent-color' after query"
    );
}

#[test]
fn replay_palette_open_shows_colon_prompt() {
    let graph = make_graph_with_tokens(&[]);
    let buf = replay_messages(
        vec![Message::Key(common::key(crossterm::event::KeyCode::Char(
            ':',
        )))],
        &graph,
    );
    assert_eq!(
        buf.cell((0, 23)).unwrap().symbol(),
        ":",
        "last row should show ':' after opening palette"
    );
}

#[test]
fn replay_produces_same_buffer_as_direct_update() {
    use design_data_tui::update;

    let graph = make_graph_with_tokens(&["accent-color"]);
    let ctx = update_ctx(&graph);

    // Direct update path — intentionally does not call execute_task. The Task
    // returned by PaletteSubmit (palette history save) writes to disk but does
    // not modify any field that affects rendering, so the buffer is identical
    // whether or not the task is executed. This verifies render output parity,
    // not side-effect parity (which is tested elsewhere).
    let mut model_direct = Model::new();
    update(
        &mut model_direct,
        Message::PaletteSubmit("query property=accent-color".into()),
        &ctx,
    );
    let buf_direct = {
        let backend = TestBackend::new(80, 24);
        let mut terminal = Terminal::new(backend).unwrap();
        terminal
            .draw(|f| design_data_tui::draw(&mut model_direct, f, &Theme::terminal(), TEST_PRIMER))
            .unwrap();
        terminal.backend().buffer().clone()
    };

    // Replay path.
    let buf_replay = replay_messages(
        vec![Message::PaletteSubmit("query property=accent-color".into())],
        &graph,
    );

    assert!(
        buf_direct == buf_replay,
        "replay must produce byte-identical buffer to direct update"
    );
}
