// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

use ratatui::{
    layout::{Constraint, Direction, Layout, Rect},
    style::Style,
    text::{Line, Span},
    widgets::{Block, Borders, Clear, Paragraph},
    Frame,
};

mod find;
mod home;
mod naming;
mod results;
pub(crate) mod shared;
mod wizard;

use crate::app::{ActiveView, Modal, StatusKind};
use crate::help::HELP_TEXT;
use crate::model::Model;
use crate::theme::Theme;
use find::render_find;
use home::render_home;
use naming::render_naming;
use results::{render_describe, render_query, render_resolve, render_validate};
use wizard::render_wizard;

/// Return a centered `Rect` covering `percent_x` × `percent_y` of `area`.
fn centered_rect(percent_x: u16, percent_y: u16, area: Rect) -> Rect {
    let vert = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Percentage((100 - percent_y) / 2),
            Constraint::Percentage(percent_y),
            Constraint::Percentage((100 - percent_y) / 2),
        ])
        .split(area);
    Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage((100 - percent_x) / 2),
            Constraint::Percentage(percent_x),
            Constraint::Percentage((100 - percent_x) / 2),
        ])
        .split(vert[1])[1]
}

/// Render a complete frame: primer header, active view, status bar, palette prompt, and any
/// overlay modal. This is the single entry point for all rendering; call it from
/// `terminal.draw(|f| draw(app, f, theme, primer_line))`.
pub fn draw(model: &mut Model, frame: &mut Frame, theme: &Theme, primer_line: &str) {
    let status_height = u16::from(model.status_message.is_some());
    let area = frame.area();

    // Three-region layout (RFC #973 §3.1): primer header / active view / status+palette.
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(1),             // primer header
            Constraint::Min(0),                // active view
            Constraint::Length(status_height), // status message
            Constraint::Length(1),             // palette prompt
        ])
        .split(area);

    // Primer header.
    let primer_text = Line::from(vec![
        Span::styled("▶ ", Style::default().fg(theme.ok)),
        Span::raw(primer_line),
    ]);
    frame.render_widget(Paragraph::new(primer_text), chunks[0]);

    // Pre-extract palette fields before the active_view borrow.
    let palette_input: String = model.palette_input_value().to_string();
    let (palette_visual_cursor, palette_list_selected) =
        if let crate::model::mode::Mode::InPalette(ref ps) = model.mode {
            (ps.input.visual_cursor(), ps.list_selected)
        } else {
            (0, None)
        };

    // Active view.
    match &mut model.active_view {
        ActiveView::Empty => {
            render_home(
                frame,
                chunks[1],
                theme,
                &palette_input,
                palette_visual_cursor,
                palette_list_selected,
            );
        }
        ActiveView::Query(ref mut qv) => render_query(frame, qv, chunks[1], theme),
        ActiveView::Resolve(ref mut rv) => render_resolve(frame, rv, chunks[1], theme),
        ActiveView::Describe(ref dv) => render_describe(frame, dv, chunks[1], theme),
        ActiveView::Validate(ref mut vv) => render_validate(frame, vv, chunks[1], theme),
    }

    // Status message — ok color for info, error color for errors.
    if let Some(ref msg) = model.status_message {
        let color = match msg.kind {
            StatusKind::Info => theme.ok,
            StatusKind::Error => theme.error,
        };
        frame.render_widget(
            Paragraph::new(msg.text.as_str()).style(Style::default().fg(color)),
            chunks[2],
        );
    }

    // chunk[3] is kept as a 1-row reserve to stay in sync with compute_hit_regions.
    // The palette prompt lives inside render_home (always-on home palette).

    // Overlay modal (rendered last so it appears on top).
    if let Some(modal) = model.modal_mut() {
        match modal {
            Modal::Find(ref mut fs) => {
                let popup_area = centered_rect(82, 85, area);
                frame.render_widget(Clear, popup_area);
                render_find(frame, fs, popup_area, theme);
            }
            Modal::Wizard(ref mut ws) => {
                let popup_area = centered_rect(82, 85, area);
                frame.render_widget(Clear, popup_area);
                render_wizard(frame, ws, popup_area, theme);
            }
            Modal::Naming(ref mut ns) => {
                let popup_area = centered_rect(82, 85, area);
                frame.render_widget(Clear, popup_area);
                render_naming(frame, ns, popup_area, theme);
            }
            Modal::Help(ref hm) => {
                render_help_modal(frame, hm.scroll, area);
            }
        }
    }
}

fn render_help_modal(f: &mut Frame<'_>, scroll: u16, area: Rect) {
    let popup_area = centered_rect(80, 90, area);
    f.render_widget(Clear, popup_area);
    let para = Paragraph::new(HELP_TEXT)
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title(" Help  ?/Esc to close "),
        )
        .scroll((scroll, 0));
    f.render_widget(para, popup_area);
}
