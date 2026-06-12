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
//! closures synchronously, calls `draw` each frame, and rebuilds hit regions.
//! Pass `record = Some(&mut writer)` to serialize every `Message` to NDJSON.
//! `replay` feeds a pre-recorded message stream through `update` deterministically.

use std::io::Write;
use std::time::Instant;

use crossterm::event::{self, Event, KeyEventKind};
use miette::{IntoDiagnostic, Result};
use ratatui::{
    layout::{Constraint, Direction, Layout, Rect},
    Terminal,
};

use crate::app::{ActiveView, HitAction, HitRegion};
use crate::message::Message;
use crate::model::Model;
use crate::subscription::{subscriptions, Subscriptions, TICK_INTERVAL};
use crate::task::Task;
use crate::theme::Theme;
use crate::update::ctx::UpdateCtx;
use crate::update::update;
use crate::view::draw;

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
        let mut frame_area = Rect::default();
        let status_height = u16::from(model.status_message.is_some());

        // Draw.
        terminal
            .draw(|f| {
                frame_area = f.area();
                draw(&mut model, f, theme, primer_line);
            })
            // ratatui 0.30: Backend::Error no longer implies Send+Sync, so we
            // cannot use into_diagnostic(); convert via Display instead.
            .map_err(|e| miette::miette!("{e}"))?;

        // Rebuild mouse hit regions from the frame geometry set during draw.
        model.hit_regions = compute_hit_regions(&model, status_height, frame_area);

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

/// Rebuild hit regions after a draw, mirroring the layout computed inside `view::draw`.
///
/// SYNC WITH view::draw layout: the constraint array below must stay identical to the
/// one in `view::draw`. If a chunk is added or reordered there, update this function to
/// match or click targets will silently drift.
fn compute_hit_regions(model: &Model, status_height: u16, frame_area: Rect) -> Vec<HitRegion> {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(1),             // primer header  ← SYNC WITH view::draw
            Constraint::Min(0),                // active view    ← SYNC WITH view::draw
            Constraint::Length(status_height), // status message ← SYNC WITH view::draw
            Constraint::Length(1),             // palette prompt ← SYNC WITH view::draw
        ])
        .split(frame_area);

    let view_area = chunks[1];
    // Tables have a top border (1) + header row (1) before data rows start.
    let data_y = view_area.y + 2;
    let data_height = view_area.height.saturating_sub(2);

    let mut regions = Vec::new();
    match &model.active_view {
        ActiveView::Query(qv) => {
            for (i, row) in qv.rows.iter().enumerate() {
                let y = data_y + i as u16;
                if i as u16 >= data_height {
                    break;
                }
                regions.push(HitRegion {
                    rect: Rect {
                        x: view_area.x,
                        y,
                        width: view_area.width,
                        height: 1,
                    },
                    action: HitAction::SelectListRow(i),
                    text: format!("{}\t{}\t{}\t{}", row.name, row.value, row.file, row.layer),
                });
            }
        }
        ActiveView::Resolve(rv) => {
            for (i, row) in rv.rows.iter().enumerate() {
                let y = data_y + i as u16;
                if i as u16 >= data_height {
                    break;
                }
                regions.push(HitRegion {
                    rect: Rect {
                        x: view_area.x,
                        y,
                        width: view_area.width,
                        height: 1,
                    },
                    action: HitAction::SelectListRow(i),
                    text: format!("{}\t{}\t{}\t{}", row.name, row.value, row.file, row.layer),
                });
            }
        }
        ActiveView::Validate(vv) => {
            use crate::app::VisibleRow;
            for (i, vr) in vv.visible.iter().enumerate() {
                let y = data_y + i as u16;
                if i as u16 >= data_height {
                    break;
                }
                let text = match vr {
                    VisibleRow::Group(g) => {
                        let group = &vv.groups[*g];
                        if group.members.len() > 1 {
                            let toggle = if group.expanded { "▼" } else { "▶" };
                            format!(
                                "{}\t{}\t×{} {}\t{}",
                                group.severity,
                                group.rule_id,
                                group.members.len(),
                                toggle,
                                group.message
                            )
                        } else {
                            let row = &vv.rows[group.members[0]];
                            format!(
                                "{}\t{}\t{}\t{}",
                                row.severity, row.rule_id, row.token, row.message
                            )
                        }
                    }
                    VisibleRow::Child(g, c) => {
                        let row_idx = vv.groups[*g].members[*c];
                        let row = &vv.rows[row_idx];
                        format!("  {}", row.token)
                    }
                };
                regions.push(HitRegion {
                    rect: Rect {
                        x: view_area.x,
                        y,
                        width: view_area.width,
                        height: 1,
                    },
                    action: HitAction::SelectListRow(i),
                    text,
                });
            }
        }
        ActiveView::Empty | ActiveView::Describe(_) => {}
    }
    regions
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

    /// Guard: `compute_hit_regions` layout must stay synchronized with `view::draw`.
    ///
    /// SYNC WITH view::draw — if the layout constraints in `view::draw` change, this
    /// test will fail because the rendered row positions will shift relative to what
    /// `compute_hit_regions` expects. Fix both together (see "SYNC WITH view::draw"
    /// comment in `compute_hit_regions`).
    #[test]
    fn hit_regions_align_with_rendered_buffer_rows() {
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

        // Render to a TestBackend.
        let backend = TestBackend::new(W, H);
        let mut terminal = Terminal::new(backend).unwrap();
        terminal
            .draw(|f| draw(&mut model, f, &Theme::terminal(), "test · 3 tokens"))
            .unwrap();
        let buf = terminal.backend().buffer().clone();

        // Compute hit regions with the same geometry.
        let frame_area = Rect::new(0, 0, W, H);
        let status_height = u16::from(model.status_message.is_some()); // 0
        let regions = compute_hit_regions(&model, status_height, frame_area);

        // We should get exactly 3 rows (one per token).
        assert_eq!(regions.len(), 3, "expected 3 hit regions for 3 tokens");

        // Cross-check: the buffer row at each region's y must have non-space content.
        // This fails if compute_hit_regions returns a y that is outside the table data
        // area because view::draw changed its layout without updating compute_hit_regions.
        for (i, region) in regions.iter().enumerate() {
            let y = region.rect.y;
            // Scan a few columns looking for a non-space character — the token name.
            let has_content =
                (1..20u16).any(|x| buf.cell((x, y)).map(|c| c.symbol() != " ").unwrap_or(false));
            assert!(
                has_content,
                "hit region {i} at y={y} has no rendered content in the buffer — \
                 compute_hit_regions is out of sync with view::draw"
            );

            // Also check rows are sequential.
            if i > 0 {
                assert_eq!(
                    region.rect.y,
                    regions[i - 1].rect.y + 1,
                    "hit region rows should be consecutive"
                );
            }
        }
    }
}
