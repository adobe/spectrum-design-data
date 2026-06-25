// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Crossterm event loop — the runtime adapter (GH #1021) and record/replay (GH #1025).
//!
//! `run` pumps crossterm events through `update`, executes returned `Task::Cmd`
//! closures synchronously, and calls `draw` each frame. Hit regions are populated
//! by `view::draw` directly into `model.hit_registry` (GH #1171).
//! Pass `record = Some(&mut writer)` to serialize every `Message` to NDJSON.
//! `replay` feeds a pre-recorded message stream through `update` deterministically.

use std::io::Write;
use std::time::Instant;

use crate::message::Message;
use crate::model::Model;
use crate::subscription::{subscriptions, Subscriptions, TICK_INTERVAL};
use crate::task::Task;
use crate::theme::Theme;
use crate::update::ctx::UpdateCtx;
use crate::update::update;
use crate::view::draw;
use crossterm::event::{self, Event, KeyEventKind};
use miette::{IntoDiagnostic, Result};
use ratatui::Terminal;

/// Run the TUI event loop until the user quits.
///
/// Pumps crossterm events → `Message` → `update` → `Task` execution → `draw` each frame.
/// Pass `record = Some(writer)` to serialize every dispatched `Message` to NDJSON.
pub fn run<B: ratatui::backend::Backend>(
    terminal: &mut Terminal<B>,
    mut model: Model,
    ctx: &UpdateCtx<'_>,
    theme: &Theme,
    primer_line: &str,
    mut record: Option<&mut dyn Write>,
) -> Result<()> {
    // Identity-keyed subscription set (#1022). The periodic `Tick` that used to be
    // a hard-coded poll-timeout is now just another subscription the loop polls.
    let mut subs: Subscriptions<Message> = Subscriptions::new();
    loop {
        // Draw — also clears and repopulates model.hit_registry for this frame.
        terminal
            .draw(|f| {
                draw(&mut model, f, theme, primer_line);
            })
            // ratatui 0.30: Backend::Error no longer implies Send+Sync, so we
            // cannot use into_diagnostic(); convert via Display instead.
            .map_err(|e| miette::miette!("{e}"))?;

        // Reconcile the active subscription set, then poll for input only until
        // the soonest subscription is due (so ticks fire on cadence).
        subs.diff(subscriptions(&model), Instant::now());
        let timeout = subs.next_timeout(Instant::now()).unwrap_or(TICK_INTERVAL);

        if event::poll(timeout).into_diagnostic()? {
            match event::read().into_diagnostic()? {
                Event::Key(key) if key.kind == KeyEventKind::Press => {
                    dispatch_and_record(&mut model, Message::Key(key), ctx, &mut record);
                }
                Event::Key(_) => {}
                Event::Mouse(me) => {
                    dispatch_and_record(&mut model, Message::Mouse(me), ctx, &mut record);
                }
                _ => {}
            }
        }

        // Fire any subscriptions whose interval elapsed (e.g. the periodic Tick).
        for msg in subs.poll(Instant::now()) {
            dispatch_and_record(&mut model, msg, ctx, &mut record);
            if model.quit {
                break;
            }
        }

        if model.quit {
            break;
        }
    }

    Ok(())
}

/// Replay a pre-recorded `Message` stream through `update` + `draw` deterministically.
///
/// Does not poll for real events. After all messages are consumed, calls `draw` once
/// so the terminal's backend buffer reflects the final state.
pub fn replay<B: ratatui::backend::Backend>(
    terminal: &mut Terminal<B>,
    mut model: Model,
    ctx: &UpdateCtx<'_>,
    theme: &Theme,
    primer_line: &str,
    messages: impl Iterator<Item = Message>,
) -> Result<()> {
    for msg in messages {
        let task = update(&mut model, msg, ctx);
        execute_task(task, &mut model, ctx);
        if model.quit {
            break;
        }
    }
    // Final draw so the caller can inspect the terminal buffer.
    terminal
        .draw(|f| draw(&mut model, f, theme, primer_line))
        // ratatui 0.30: Backend::Error no longer implies Send+Sync; convert via Display.
        .map_err(|e| miette::miette!("{e}"))?;
    Ok(())
}

/// Dispatch a single message through `update` and run its resulting `Task` tree to
/// completion, executing every `Task::Cmd` closure and feeding the produced
/// messages back through `update`.
///
/// The interactive loop ([`run`]) drives messages itself; this helper exists for
/// headless drivers and tests that need a command's side effects (e.g. the
/// `describe`/`validate` FS reads that now complete via `DescribeDone`/`ValidateDone`)
/// to settle synchronously before asserting on `Model` state.
pub fn dispatch(model: &mut Model, msg: Message, ctx: &UpdateCtx<'_>) {
    let task = update(model, msg, ctx);
    execute_task(task, model, ctx);
}

/// Record `msg` to the optional writer as a JSON line, then dispatch through update.
fn dispatch_and_record(
    model: &mut Model,
    msg: Message,
    ctx: &UpdateCtx<'_>,
    record: &mut Option<&mut dyn Write>,
) {
    if let Some(w) = record.as_deref_mut() {
        if let Ok(line) = serde_json::to_string(&msg) {
            let _ = writeln!(w, "{line}");
        }
    }
    let task = update(model, msg, ctx);
    execute_task(task, model, ctx);
}

/// Execute a task tree synchronously, feeding results back through `update`.
///
/// Execute a task tree iteratively, feeding `Cmd` results back through `update`.
///
/// Uses an explicit work queue (no recursion) so arbitrarily deep `Task::Batch`
/// trees — as may arise when #1022 Subscriptions land — are handled without
/// stack-overflow risk. All current `Cmd` closures are synchronous (FS writes,
/// clipboard); async `Task::Perform` support is deferred.
fn execute_task(initial: Task<Message>, model: &mut Model, ctx: &UpdateCtx<'_>) {
    let mut work: Vec<Task<Message>> = vec![initial];
    while let Some(task) = work.pop() {
        match task {
            Task::None => {}
            Task::Cmd(f) => {
                let msg = f();
                work.push(update(model, msg, ctx));
            }
            Task::Batch(tasks) => {
                // Reverse so the first element in the batch executes first (LIFO pop).
                work.extend(tasks.into_iter().rev());
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::message::Message;
    use crate::theme::Theme;
    use crate::update::ctx::UpdateCtx;
    use crate::update::update;
    use design_data_core::graph::{Layer, TokenGraph, TokenRecord};
    use ratatui::backend::TestBackend;
    use ratatui::Terminal;
    use serde_json::json;
    use std::path::PathBuf;

    fn make_test_graph(names: &[&str]) -> TokenGraph {
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
                raw: json!({ "value": "red", "name": { "property": name } }),
                layer: Layer::Foundation,
            })
            .collect();
        TokenGraph::from_records(records)
    }

    #[test]
    fn execute_task_handles_deeply_nested_batch_without_stack_overflow() {
        // 10 000 levels of Batch nesting would overflow the call stack with a
        // recursive execute_task. The iterative implementation handles it in O(1) stack.
        let graph = TokenGraph::default();
        let ctx = UpdateCtx::minimal(&graph);
        let mut model = Model::new();

        let deep = (0..10_000).fold(Task::none(), |inner, _| Task::batch(vec![inner]));

        // Passes if it completes without stack overflow or panic.
        execute_task(deep, &mut model, &ctx);
    }

    /// Guard: hit-region geometry registered by `view::draw` must align with the
    /// actual rendered buffer rows.
    ///
    /// Unlike the old `compute_hit_regions` test that had to replicate the layout,
    /// this test drives the registry through the real render path — so any layout
    /// change that would have caused silent click-target drift now fails here first.
    #[test]
    fn hit_registry_aligns_with_rendered_buffer_rows() {
        const W: u16 = 80;
        const H: u16 = 24;

        // Set up a 3-token graph and open a "query *" view so we have multiple rows.
        let graph = make_test_graph(&[
            "accent-background-color-default",
            "neutral-background-color-default",
            "positive-background-color-default",
        ]);
        let ctx = UpdateCtx::minimal(&graph);
        let mut model = Model::new();
        update(
            &mut model,
            Message::PaletteSubmit("query property=*".into()),
            &ctx,
        );
        assert!(
            matches!(model.active_view, crate::app::ActiveView::Query(_)),
            "expected Query view after 'query property=*'"
        );

        // Render to a TestBackend — this populates model.hit_registry.
        let backend = TestBackend::new(W, H);
        let mut terminal = Terminal::new(backend).unwrap();
        terminal
            .draw(|f| draw(&mut model, f, &Theme::terminal(), "test · 3 tokens"))
            .unwrap();
        let buf = terminal.backend().buffer().clone();

        // We should get exactly 3 rows (one per token).
        let regions = model.hit_registry.regions();
        assert_eq!(
            regions.len(),
            3,
            "expected 3 registered regions for 3 tokens"
        );

        // Cross-check: the buffer row at each registered area must have non-space
        // content (the token name). Drift between registration and rendered position
        // would produce a row of spaces here.
        for (i, region) in regions.iter().enumerate() {
            let y = region.area.y;
            let has_content =
                (1..20u16).any(|x| buf.cell((x, y)).map(|c| c.symbol() != " ").unwrap_or(false));
            assert!(
                has_content,
                "registered region {i} at y={y} has no rendered content in the buffer — \
                 hit-region registration is out of sync with view::draw"
            );

            // Rows must be sequential.
            if i > 0 {
                assert_eq!(
                    region.area.y,
                    regions[i - 1].area.y + 1,
                    "registered region rows should be consecutive"
                );
            }
        }
    }

    /// Regression: hit regions must reflect the current scroll offset.
    ///
    /// When the table is scrolled (offset > 0), the first registered region must
    /// map to the first *visible* row (logical index = offset), not row 0. A click
    /// at data_y should select the row at `offset`, not row 0.
    ///
    /// Uses H=8 so chunks[1]=6, body=5, data_height=5-3=2 — only 2 of the 3 rows
    /// fit. Selecting the last row forces ratatui to scroll (offset=1).
    #[test]
    fn hit_registry_respects_scroll_offset() {
        use crate::app::{ActiveView, HitAction, QueryRow, QueryView};

        const W: u16 = 80;
        // H=8: chunks[1]=6, body=5, data_height=5-3=2. 3 rows > 2 visible → scroll needed.
        const H: u16 = 8;

        let graph = TokenGraph::default();
        let _ctx = UpdateCtx::minimal(&graph);
        let mut model = Model::new();

        let rows = vec![
            QueryRow {
                name: "row0".into(),
                value: "0".into(),
                file: "f".into(),
                layer: "foundation".into(),
                uuid: None,
                source_path: std::path::PathBuf::new(),
            },
            QueryRow {
                name: "row1".into(),
                value: "1".into(),
                file: "f".into(),
                layer: "foundation".into(),
                uuid: None,
                source_path: std::path::PathBuf::new(),
            },
            QueryRow {
                name: "row2".into(),
                value: "2".into(),
                file: "f".into(),
                layer: "foundation".into(),
                uuid: None,
                source_path: std::path::PathBuf::new(),
            },
        ];
        let mut qv = QueryView::new("*".to_string(), rows);
        // Select last row — ratatui will set offset=1 during render_stateful_widget
        // so that row 2 is visible (rows 1, 2 occupy the 2 data slots).
        qv.table_state.select(Some(2));
        model.active_view = ActiveView::Query(qv);

        let backend = TestBackend::new(W, H);
        let mut terminal = Terminal::new(backend).unwrap();
        terminal
            .draw(|f| draw(&mut model, f, &Theme::terminal(), "scroll · 3 tokens"))
            .unwrap();

        let regions = model.hit_registry.regions();
        // Only 2 data rows fit at data_height=2 — row0 is scrolled off.
        assert_eq!(
            regions.len(),
            2,
            "only visible rows (1 and 2) should be registered"
        );

        // First visible position must map to logical row 1 (not row 0).
        assert!(
            matches!(regions[0].data.action, HitAction::SelectListRow(1)),
            "first region should map to logical row 1 (scrolled-to), got SelectListRow({})",
            match &regions[0].data.action {
                HitAction::SelectListRow(i) => i,
            }
        );
        assert!(
            matches!(regions[1].data.action, HitAction::SelectListRow(2)),
            "second region should map to logical row 2"
        );
    }
}
