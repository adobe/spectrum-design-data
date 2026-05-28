// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Crossterm event loop — the runtime adapter (GH #1021).
//!
//! `run` pumps crossterm events through `update`, executes returned `Task::Cmd`
//! closures synchronously, calls `draw` each frame, and rebuilds hit regions.
//! `main.rs` is now a thin CLI entry point that delegates entirely to this function.

use crossterm::event::{self, Event, KeyCode, KeyEventKind};
use miette::{IntoDiagnostic, Result};
use ratatui::{
    Terminal,
    layout::{Constraint, Direction, Layout, Rect},
};

use crate::app::{ActiveView, HitAction, HitRegion};
use crate::message::Message;
use crate::model::Model;
use crate::task::Task;
use crate::theme::Theme;
use crate::update::{update, UpdateCtx};
use crate::view::draw;

/// Run the TUI event loop until the user quits.
///
/// Pumps crossterm events → `Message` → `update` → `Task` execution → `draw` each frame.
pub fn run<B: ratatui::backend::Backend>(
    terminal: &mut Terminal<B>,
    mut model: Model,
    ctx: &UpdateCtx<'_>,
    theme: &Theme,
    primer_line: &str,
) -> Result<()> {
    loop {
        let mut frame_area = Rect::default();
        let status_height = u16::from(model.status_message.is_some());

        // Draw.
        terminal
            .draw(|f| {
                frame_area = f.area();
                draw(&mut model, f, theme, primer_line);
            })
            .into_diagnostic()?;

        // Rebuild mouse hit regions from the frame geometry set during draw.
        model.hit_regions = compute_hit_regions(&model, status_height, frame_area);

        // Poll for the next crossterm event (16 ms ≈ 60 fps cadence).
        if event::poll(std::time::Duration::from_millis(16)).into_diagnostic()? {
            match event::read().into_diagnostic()? {
                Event::Key(key) if key.kind == KeyEventKind::Press => {
                    // Capture palette input text BEFORE sending Key(Enter) to update(),
                    // because update() clears palette_input as part of closing the palette.
                    // If Enter does close the palette (model.palette_open flips false),
                    // we then dispatch PaletteSubmit with the captured text. If update()
                    // ever defers closing (e.g., for validation), palette_text is Some but
                    // the guard `!model.palette_open` will be false, so PaletteSubmit is
                    // correctly suppressed.
                    let palette_text = if model.palette_open && key.code == KeyCode::Enter {
                        Some(model.palette_input.value().to_string())
                    } else {
                        None
                    };

                    let task = update(&mut model, Message::Key(key), ctx);
                    execute_task(task, &mut model, ctx);

                    // Dispatch the command only if Enter actually closed the palette.
                    if let Some(text) = palette_text {
                        if !model.palette_open {
                            let task =
                                update(&mut model, Message::PaletteSubmit(text), ctx);
                            execute_task(task, &mut model, ctx);
                        }
                    }
                }
                Event::Key(_) => {}
                Event::Mouse(me) => {
                    let task = update(&mut model, Message::Mouse(me), ctx);
                    execute_task(task, &mut model, ctx);
                }
                _ => {}
            }
        } else {
            // No event this frame — send a Tick so subscriptions can fire (#1022).
            let task = update(&mut model, Message::Tick, ctx);
            execute_task(task, &mut model, ctx);
        }

        if model.quit {
            break;
        }
    }

    Ok(())
}

/// Execute a task tree synchronously, feeding results back through `update`.
///
/// All current `Task::Cmd` closures are fast (FS writes, clipboard) so synchronous
/// execution is appropriate. Async `Perform` support is deferred to #1022.
///
/// **Recursion depth**: each `Task::Cmd` result is fed back through `update`, which
/// in turn may return another `Task`. In practice the chain is shallow (draft save →
/// `Tick` → `Task::None`). If #1022 introduces `Task::Perform` with chained batches
/// this should be converted to an explicit stack to avoid stack overflow.
fn execute_task(task: Task<Message>, model: &mut Model, ctx: &UpdateCtx<'_>) {
    match task {
        Task::None => {}
        Task::Cmd(f) => {
            let msg = f();
            let next = update(model, msg, ctx);
            execute_task(next, model, ctx);
        }
        Task::Batch(tasks) => {
            for t in tasks {
                execute_task(t, model, ctx);
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
                    rect: Rect { x: view_area.x, y, width: view_area.width, height: 1 },
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
                    rect: Rect { x: view_area.x, y, width: view_area.width, height: 1 },
                    action: HitAction::SelectListRow(i),
                    text: format!("{}\t{}\t{}\t{}", row.name, row.value, row.file, row.layer),
                });
            }
        }
        ActiveView::Validate(vv) => {
            for (i, row) in vv.rows.iter().enumerate() {
                let y = data_y + i as u16;
                if i as u16 >= data_height {
                    break;
                }
                regions.push(HitRegion {
                    rect: Rect { x: view_area.x, y, width: view_area.width, height: 1 },
                    action: HitAction::SelectListRow(i),
                    text: format!(
                        "{}\t{}\t{}\t{}",
                        row.severity, row.rule_id, row.token, row.message
                    ),
                });
            }
        }
        ActiveView::Empty | ActiveView::Describe(_) => {}
    }
    regions
}

